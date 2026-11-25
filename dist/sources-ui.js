'use strict';
(function(){
  const S=window.SadhanaSources,M=window.SadhanaMatching,G=window.SadhanaGoogleSheets;
  const P=window.SadhanaGooglePicker;
  const defaultSheets=()=>({responses:{...G.DEFAULT_SHEETS.responses},prescriptions:{...G.DEFAULT_SHEETS.prescriptions}});
  let selectedSheets=defaultSheets(),accessNeeded=false,pickerReady=false,skipPickerClose=false,pendingRole=null;
  const targetFields=['rounds','reading','hearing'];
  const rawText=E.displayRaw;
  const targetText=t=>M.valid(t||{})?t.rounds+' rounds · '+t.reading+' min reading · '+t.hearing+' min hearing':'Targets need clarification';
  let googleToken=null,expires=0,tokenClient=null,controller=null,generation=0,authorizationGeneration=null,googleConfig=null;
  let setup=null,draftLinks=new Map(),draftTargets=new Map(),targetRows=[],initialLinks=new Map(),editingPerson=null,draggedGroup=null,selectedGroup=null,activeValue=null,refreshRequested=false;

  function addDialog(id,title,body){
    const d=document.createElement('dialog');d.id=id;d.className='source-dialog';d.setAttribute('aria-labelledby',id+'Title');
    d.innerHTML='<div class="dialog-top"><h2 id="'+id+'Title" tabindex="-1">'+title+'</h2><button class="close-button" data-close="'+id+'" aria-label="Close '+title.toLowerCase()+'">×</button></div><div class="source-body">'+body+'</div>';
    document.body.append(d);return d;
  }
  const sources=addDialog('sourcesDialog','Load your data',`
    <section id="sourceStage">
      <p>Choose how to load the same two sources: daily responses and personal prescriptions.</p>
      <div class="source-methods" role="group" aria-label="Choose data source"><button id="chooseLocal" type="button"><strong>Local files</strong><span>Select two Excel or CSV files</span></button><button id="chooseGoogle" type="button"><strong>Google Sheets</strong><span>Read both sheets using your Google account</span></button></div>
      <form id="localSourcesForm" hidden><div class="source-file-grid"><label id="localResponseSlot">Daily responses</label><label>Personal prescriptions<input id="prescriptionUpload" required type="file" accept=".xlsx,.xls,.csv"></label></div><p>Keep the original column headings in each file. Both files are required; calculated score columns are ignored.</p><button class="import-button" type="submit">Load files & review</button><p id="localStatus" role="alert"></p></form>
      <form id="googleSourcesForm" hidden>
        <p>These two sheets are preselected. Sign in and load them, or use Change to choose different sheets. Your Google account must have access to both.</p>
        <div class="source-file-grid"><div><strong>Daily responses</strong><p id="responseSheetName"></p><a id="responseSheetLink" class="source-sheet-link" target="_blank" rel="noopener noreferrer"></a><button id="pickResponses" class="text-button" type="button" disabled>Change response sheet</button></div><div><strong>Personal prescriptions</strong><p id="prescriptionSheetName"></p><a id="prescriptionSheetLink" class="source-sheet-link" target="_blank" rel="noopener noreferrer"></a><button id="pickPrescriptions" class="text-button" type="button" disabled>Change prescription sheet</button></div></div>
        <details><summary>Worksheet names · only if needed</summary><label>Response worksheet<input id="responseTab" placeholder="Automatic"></label><label>Prescription worksheet<input id="prescriptionTab" placeholder="Automatic"></label></details>
        <p>Google's selected-file permission also allows editing those files. This dashboard only reads them and never writes changes.</p><div class="setup-actions"><button id="googleConnect" class="import-button" type="submit" disabled>Sign in with Google</button><button id="googleApprove" class="text-button" type="button" hidden>Allow access to selected sheets</button><button id="googleDisconnect" class="text-button" type="button" hidden>Forget Google access</button></div><p id="googleStatus" role="status" aria-live="polite"></p>
      </form>
      <div id="loadedSources" hidden><div id="sourceStatus" class="source-status-list"></div><div class="setup-actions"><button id="reviewSetup" class="text-button" type="button">Review data</button><button id="reviewValues" class="text-button" type="button">Clarify practice values</button></div></div>
      <p class="source-note">Data and confirmations stay in this tab. Reload clears them. The dashboard reads your selected sheets; no sheet is edited.</p>
    </section>
    <section id="nameStage" hidden>
      <p>Match each name in the response sheet to the same person in the prescribed targets sheet. Drag a name from right to left, or select a name on the right and then its response name on the left.</p>
      <div class="matching-layout"><section class="name-pane" aria-labelledby="responseNamesHeading"><h3 id="responseNamesHeading">Names in response sheet</h3><div id="matchRows" class="name-list" role="group" aria-label="Names from recorded responses"></div></section><section class="name-pane" aria-labelledby="prescribedNamesHeading"><h3 id="prescribedNamesHeading">Names in prescribed targets sheet</h3><div id="prescriptionCards" class="name-list" role="group" aria-label="Names from prescribed values"></div></section></div>
      <p id="assignmentHint" class="source-note" role="status" aria-live="polite"></p>
      <div class="wizard-actions"><button id="finishNameEdit" class="import-button" type="button">Done</button></div>
    </section>
    <section id="targetStage" hidden>
      <p id="reviewSummary" role="status" aria-live="polite"></p>
      <div id="identityQuestions"></div>
      <form id="targetReviewForm" novalidate><div id="targetAttention"></div><p id="targetError" role="alert"></p><p id="finishNote" class="source-note"></p><div class="wizard-actions"><button id="inspectMatches" class="text-button" type="button">View all name matches</button><button class="import-button" type="submit">Open dashboard</button></div></form>
    </section>
  `);
  const input=$('upload');input.hidden=false;input.required=true;$('localResponseSlot').append(input);
  const values=addDialog('valuesDialog','Unclear practice values',`<p>Clarify values without editing the original response. Corrections apply to this tab only.</p><div id="valueRows"></div>`);
  const valueDialog=addDialog('valueDialog','Clarify a practice value',`
    <p id="valueOriginal"></p><form id="valueForm"><label id="valueLabel">Correct value<input id="correctedValue" required></label><label class="source-checkbox"><input id="sameValues" type="checkbox"> Also use for identical values in this field in the loaded response source</label><div class="setup-actions"><button class="import-button" type="submit">Confirm value</button><button id="resetValue" class="text-button" type="button">Use original value</button></div><p id="valueError" role="alert"></p></form>
  `);
  const header=document.createElement('button');header.id='dataSources';header.className='text-button';header.textContent='Review data';header.hidden=true;$('importResponses').before(header);
  const refresh=document.createElement('button');refresh.id='refreshSheets';refresh.className='text-button';refresh.textContent='Refresh sheets';refresh.hidden=true;header.after(refresh);
  $('importSetup').querySelector('h2').textContent='Choose how to load your data';
  const start=document.createElement('div');start.className='source-start-actions';start.innerHTML='<button id="startLocal" class="import-button" type="button">Local files</button><button id="startGoogle" class="import-button secondary" type="button">Google Sheets</button>';$('importSetup').append(start);
  const banner=document.createElement('div');banner.id='sourceReview';banner.className='source-review';banner.hidden=true;$('cards').before(banner);

  function currentConfig(){return {responses:selectedSheets.responses?.id||'',prescriptions:selectedSheets.prescriptions?.id||'',responseName:selectedSheets.responses?.name,prescriptionName:selectedSheets.prescriptions?.name,responseTab:$('responseTab').value.trim(),prescriptionTab:$('prescriptionTab').value.trim()};}
  function hasGoogleToken(){return !!googleToken&&Date.now()<expires;}
  function showSelections(){
    for(const [role,prefix]of [['responses','response'],['prescriptions','prescription']]){
      const sheet=selectedSheets[role],url='https://docs.google.com/spreadsheets/d/'+sheet.id+'/';
      $(prefix+'SheetName').textContent=sheet.name||'Selected spreadsheet';$(prefix+'SheetLink').textContent=url;$(prefix+'SheetLink').href=url;
    }
  }
  showSelections();
  function setBusy(busy){
    for(const el of sources.querySelectorAll('button,input,select'))el.disabled=busy;
    const ready=!!tokenClient&&pickerReady;
    $('googleConnect').disabled=busy||!ready||(hasGoogleToken()&&(!selectedSheets.responses||!selectedSheets.prescriptions));
    $('googleConnect').textContent=hasGoogleToken()?'Load selected sheets':'Sign in with Google';
    $('googleApprove').hidden=!accessNeeded||!hasGoogleToken();
    for(const id of ['pickResponses','pickPrescriptions'])$(id).disabled=busy||!ready;
    refresh.disabled=busy;
  }
  function cancelRead(){generation++;controller?.abort();controller=null;setBusy(false);}
  function stepTo(step){
    for(const [id,s]of [['sourceStage','sources'],['nameStage','names'],['targetStage','targets']])$(id).hidden=s!==step;
    $('sourcesDialogTitle').textContent={sources:'Load your data',names:editingPerson?'Choose a name from the prescribed targets sheet':'All name matches',targets:'A few things to check'}[step];sources.scrollTop=0;$('sourcesDialogTitle').focus();
  }
  function chooseMethod(method){
    $('localSourcesForm').hidden=method!=='local';$('googleSourcesForm').hidden=method!=='google';
    for(const [id,value]of [['chooseLocal','local'],['chooseGoogle','google']])$(id).setAttribute('aria-pressed',String(method===value));
    if(method==='google')initializeGoogle();
  }
  function openSources(method){
    setup=null;draftTargets.clear();stepTo('sources');updateStatus();if(!sources.open)sources.showModal();chooseMethod(method||null);
  }
  function updateStatus(){
    const ready=!!(workspace.responses&&workspace.prescriptions);
    header.hidden=!ready;$('loadedSources').hidden=!ready;
    const format=source=>source?esc(source.title)+(source.tab?' · '+esc(source.tab):'')+'<br><small>'+source.rows.length+' entries · loaded '+new Date(source.loadedAt).toLocaleString()+'</small>':'Not loaded';
    $('sourceStatus').innerHTML='<div><strong>Daily responses</strong><span>'+format(workspace.responses)+'</span></div><div><strong>Personal prescriptions</strong><span>'+format(workspace.prescriptions)+'</span></div>';
    refresh.hidden=!(workspace.responses?.kind==='google'&&workspace.prescriptions?.kind==='google'&&googleConfig);
    const targetCount=ready?[...prepared.names.keys()].filter(id=>!M.valid(targets[id]||M.empty())).length:0;
    const valueCount=prepared.flags.filter(f=>f.type.startsWith('Check ')).length;
    banner.hidden=!data.rows.length||view==='help'||!targetCount&&!valueCount;
    banner.innerHTML='<span>'+targetCount+' students need targets · '+valueCount+' practice values need clarification.</span><button class="text-button" data-open-review="setup">Review data</button><button class="text-button" data-open-review="values">Review values</button>';
  }
  function commitChanges(){syncWorkspace();render();if($('studentDialog').open)student(activeStudent);}
  function stagePair(pair,config,asRefresh=false,inspect=false){
    const next=workspace.copy();next.setResponses(pair.responses.rows,pair.responses);next.setPrescriptions(pair.prescriptions.rows,pair.prescriptions);
    const sameResponse=workspace.responses?.key===pair.responses.key;
    const nextData={...data,source:pair.responses.title,rows:pair.responses.rows,prescriptions:pair.prescriptions.rows,roster:sameResponse||!workspace.responses?data.roster:[]};
    const nextPrepared=E.prepare({...nextData,valueOverrides:next.corrections});next.targets(nextPrepared.names);
    setup={workspace:next,data:nextData,prepared:nextPrepared,config};draftLinks=M.proposals(nextPrepared.names,next.groups,next.links);initialLinks=new Map(draftLinks);draftTargets.clear();editingPerson=null;
    const pendingNames=nameQuestions().length;
    const preview=next.copy();preview.confirmLinks(draftLinks);buildTargetRows(preview);
    const pendingTargets=targetRows.filter(r=>r.group&&!r.ready).length;
    if(!inspect&&!pendingNames&&!pendingTargets){acceptReview();toast('Data loaded. Names and targets are ready.');return;}
    if(asRefresh&&sameResponse&&workspace.prescriptions?.key===pair.prescriptions.key){
      const nextTargets=next.targets(nextPrepared.names);
      const newIdentity=[...nextPrepared.names.keys()].some(id=>!next.links.has(id));
      const newTarget=[...nextPrepared.names.keys()].some(id=>!M.valid(nextTargets[id])&&(M.valid(targets[id]||{})||!prepared.names.has(id)));
      if(!newIdentity&&!newTarget){applySetup();toast('Both sheets refreshed.');return;}
    }
    renderReview();stepTo('targets');
  }
  function reviewCurrent(){
    if(!workspace.responses||!workspace.prescriptions)return openSources();
    stagePair({responses:workspace.responses,prescriptions:workspace.prescriptions},googleConfig,false,true);if(!sources.open)sources.showModal();
  }
  async function readFile(file,kind){
    if(!file)throw new Error('Select both the daily response file and the personal prescription file.');
    if(file.size>30*1024*1024)throw new Error((kind==='responses'?'Response':'Prescription')+' file must be smaller than 30 MB.');
    try{
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false,cellNF:true,raw:/\.csv$/i.test(file.name)}),sheets=S.workbook(wb,XLSX);
      const rows=kind==='responses'?S.responseRows(sheets):S.prescriptions(sheets);
      if(!rows.length)throw new Error('No entries found.');
      return {rows,key:'file:'+file.name,title:file.name,kind:'file',loadedAt:new Date().toISOString()};
    }catch(e){throw new Error((kind==='responses'?'Responses':'Prescriptions')+': '+e.message);}
  }
  $('localSourcesForm').onsubmit=async e=>{
    e.preventDefault();cancelRead();const current=generation;setBusy(true);$('localStatus').textContent='Reading both files…';
    try{const [responses,prescriptions]=await Promise.all([readFile($('upload').files[0],'responses'),readFile($('prescriptionUpload').files[0],'prescriptions')]);if(current!==generation)return;stagePair({responses,prescriptions},null);$('localStatus').textContent='';}
    catch(error){if(current===generation)$('localStatus').textContent=error.message+' Previously loaded data has been kept.';}
    finally{if(current===generation)setBusy(false);}
  };

  function nameQuestions(){
    return [...draftLinks].filter(([id,p])=>{
      const initial=initialLinks.get(id),prior=setup.workspace.links.get(id);
      return initial?.origin==='suggested'||initial?.origin==='ambiguous'||!prior&&initial?.group===null||p.group!==initial?.group||p.group===null&&!setup.workspace.manual[id];
    });
  }
  function identityHtml(id,p){
    const name=setup.prepared.names.get(id),g=setup.workspace.groups.get(p.group),count=setup.prepared.records.filter(r=>r.id===id).length,changed=p.group!==initialLinks.get(id)?.group;
    return '<article class="identity-question" data-review-person="'+esc(id)+'"><div class="review-pair"><div><span>Name in response sheet</span><strong>'+esc(name)+'</strong></div><div><span>Selected name in prescribed targets sheet</span><strong>'+esc(g?.name||'No match selected')+'</strong></div></div><p class="source-note">'+esc(p.reason||'Check that these names refer to the same person.')+' · '+count+' recorded updates</p><div class="question-actions"><button class="text-button" type="button" data-change-person="'+esc(id)+'">'+(g?'Choose a different match':'Choose a match')+'</button>'+(g?'<button class="text-button" type="button" data-unmatch-person="'+esc(id)+'">Remove this match</button>':'<span class="source-note">Targets will stay unavailable.</span>')+(changed?'<button class="text-button" type="button" data-undo-person="'+esc(id)+'">Undo</button>':'')+'</div></article>';
  }
  function renderReview(){
    const preview=setup.workspace.copy();preview.confirmLinks(draftLinks);buildTargetRows(preview);
    const identities=nameQuestions(),unclear=targetRows.filter(r=>r.group&&!r.ready);
    $('identityQuestions').innerHTML=identities.map(([id,p])=>identityHtml(id,p)).join('');
    $('targetAttention').innerHTML=unclear.map(targetRowHtml).join('');
    $('reviewSummary').textContent=[identities.length?'Review the matches for '+identities.length+' name'+(identities.length===1?'':'s')+' from the response sheet to the prescribed targets sheet. Selected matches will be used when you click Open dashboard.':'',unclear.length?'Clarify '+unclear.length+' prescribed target'+(unclear.length===1?'':'s')+' below.':''].filter(Boolean).join(' ')||'All names and targets are ready.';
    $('targetError').textContent='';updateFinishNote();
  }
  function editNames(id=null){editingPerson=id;selectedGroup=null;renderMatches();stepTo('names');}
  $('identityQuestions').onclick=e=>{
    const change=e.target.closest('[data-change-person]'),unmatch=e.target.closest('[data-unmatch-person]'),undo=e.target.closest('[data-undo-person]');
    if(change)editNames(change.dataset.changePerson);
    if(unmatch){draftLinks.set(unmatch.dataset.unmatchPerson,{group:null,origin:'changed',reason:'Match removed by you'});renderReview();}
    if(undo){const id=undo.dataset.undoPerson;draftLinks.set(id,{...initialLinks.get(id)});renderReview();}
  };
  function responseRow(id,name){
    const p=draftLinks.get(id),g=setup.workspace.groups.get(p.group);
    const state={exact:'Exact match',confirmed:'Previously confirmed',suggested:'Suggested match',ambiguous:'Choose a prescribed name',unmatched:'No match found',changed:'Changed'}[p.origin];
    return '<strong>'+esc(name)+'</strong><span class="match-state">'+state+'</span><div class="match-assignment"><button type="button" class="match-drop" data-assign-to="'+esc(id)+'" aria-label="Assign selected prescribed name to '+esc(name)+'">'+(g?'<span class="assignment-origin">Name in prescribed targets sheet</span>'+esc(g.name):'Drop a name from the prescribed targets sheet here')+'</button>'+(g?'<button type="button" class="clear-match" data-clear-match="'+esc(id)+'" aria-label="Clear match for '+esc(name)+'">×</button>':'')+'</div>'+(p.reason?'<small class="match-reason">'+esc(p.reason)+'</small>':'');
  }
  function renderMatches(){
    if(!setup)return;
    $('matchRows').innerHTML=[...setup.prepared.names].filter(([id])=>!editingPerson||id===editingPerson).sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>'<article class="match-row" data-match-person="'+esc(id)+'">'+responseRow(id,name)+'</article>').join('')||'<p>No response names found.</p>';
    $('prescriptionCards').innerHTML=[...setup.workspace.groups.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(g=>'<button type="button" class="prescription-card" draggable="true" data-prescription="'+esc(g.id)+'" aria-pressed="false">'+esc(g.name)+'</button>').join('');
    updateSelection();
  }
  function updateSelection(){
    for(const card of $('prescriptionCards').querySelectorAll('[data-prescription]'))card.setAttribute('aria-pressed',String(card.dataset.prescription===selectedGroup));
    $('assignmentHint').textContent=selectedGroup?setup.workspace.groups.get(selectedGroup).name+' selected. Choose its recorded response on the left.':'';
  }
  function changeMatch(id,group){
    draftLinks.set(id,{group,origin:'changed',reason:group?'Selected by you':''});
    const row=[...$('matchRows').querySelectorAll('[data-match-person]')].find(r=>r.dataset.matchPerson===id);
    if(row){row.innerHTML=responseRow(id,setup.prepared.names.get(id));row.querySelector('.match-drop').focus({preventScroll:true});}
    selectedGroup=null;updateSelection();
  }
  $('nameStage').addEventListener('click',e=>{
    const card=e.target.closest('[data-prescription]');if(card){selectedGroup=selectedGroup===card.dataset.prescription?null:card.dataset.prescription;updateSelection();return;}
    const clear=e.target.closest('[data-clear-match]');if(clear){changeMatch(clear.dataset.clearMatch,null);return;}
    const destination=e.target.closest('[data-assign-to]');if(destination){if(selectedGroup)changeMatch(destination.dataset.assignTo,selectedGroup);else $('assignmentHint').textContent='Select a prescribed name on the right, then choose its recorded response.';}
  });
  sources.addEventListener('dragstart',e=>{const card=e.target.closest('[data-prescription]');if(card){draggedGroup=card.dataset.prescription;e.dataTransfer.setData('text/plain',draggedGroup);e.dataTransfer.effectAllowed='copy';}});
  function clearDrag(){draggedGroup=null;for(const row of $('matchRows').querySelectorAll('.is-drop-target'))row.classList.remove('is-drop-target');}
  sources.addEventListener('dragend',clearDrag);
  sources.addEventListener('dragover',e=>{const row=e.target.closest('[data-match-person]');if(draggedGroup&&row){e.preventDefault();row.classList.add('is-drop-target');}});
  sources.addEventListener('dragleave',e=>{const row=e.target.closest('[data-match-person]');if(row&&!row.contains(e.relatedTarget))row.classList.remove('is-drop-target');});
  sources.addEventListener('drop',e=>{const row=e.target.closest('[data-match-person]'),id=draggedGroup;if(!row||!setup.workspace.groups.has(id))return;e.preventDefault();changeMatch(row.dataset.matchPerson,id);clearDrag();});
  $('finishNameEdit').onclick=()=>{renderReview();stepTo('targets');};
  $('inspectMatches').onclick=()=>editNames();

  function buildTargetRows(w=setup.workspace){
    const result=new Map();
    for(const [id,name]of setup.prepared.names){
      if(w.manual[id]){result.set('person:'+id,{key:'person:'+id,name,person:id,base:w.manual[id],entries:[],ready:true,manual:true});continue;}
      const group=w.links.get(id)?.group,g=w.groups.get(group),key=g?'group:'+group:'person:'+id;
      if(result.has(key))continue;
      const target=g&&(w.resolved.get(group)||g.target);
      result.set(key,{key,name:g?g.name:name,group:g?.id,person:g?null:id,base:target||g?.common||M.empty(),entries:g?.entries||[],ready:M.valid(target||{}),manual:false});
    }
    targetRows=[...result.values()].sort((a,b)=>Number(a.ready)-Number(b.ready)||a.name.localeCompare(b.name));
    for(const key of draftTargets.keys())if(!result.has(key))draftTargets.delete(key);
  }
  function targetRowHtml(row){
    const draft=draftTargets.get(row.key),t=draft||row.base;
    const evidence=row.entries.map((r,i)=>'<div class="target-evidence"><span class="source-note">Original prescription · row '+r.row+'</span><p>'+targetFields.map(k=>esc(({rounds:'Rounds',reading:'Reading',hearing:'Hearing'})[k])+': '+esc(r.target[k]===null?rawText(r.original?.[k]?.value??r.raw[k]):r.target[k]+(k==='rounds'?'':' min'))).join(' · ')+'</p>'+(row.entries.length>1?'<button class="text-button" type="button" data-use-entry="'+i+'">Use these values</button>':'')+'</div>').join('');
    return '<article class="target-review-row" data-target-key="'+esc(row.key)+'"><div class="target-row-heading"><strong>What are '+esc(row.name)+"’s targets?"+'</strong><span>'+(draft?'Edited':'Needs clarification')+'</span></div>'+evidence+'<div class="source-target-inputs">'+targetFields.map(k=>'<label>'+({rounds:'Rounds',reading:'Reading · minutes',hearing:'Hearing · minutes'})[k]+'<input data-target-field="'+k+'" type="number" min="0.01" max="'+(k==='rounds'?1000:1440)+'" step="'+(k==='rounds'?'1':'any')+'" value="'+(t[k]??'')+'"></label>').join('')+'</div><button class="text-button" data-undo-target type="button" '+(!draft?'hidden':'')+'>Undo edit</button><p class="source-note">Leave this unchanged if you cannot determine the targets.</p></article>';
  }
  function updateFinishNote(){
    if(!setup)return;const preview=setup.workspace.copy();preview.confirmLinks(draftLinks);const current=preview.targets(setup.prepared.names);
    const missing=[...setup.prepared.names.keys()].filter(id=>{const group=preview.links.get(id)?.group,t=draftTargets.get('group:'+group)||draftTargets.get('person:'+id)||current[id];return !M.valid(t||{});}).length;
    $('finishNote').textContent=missing?'Targets will be unavailable for '+missing+' '+(missing===1?'person':'people')+'. You can resolve them later in Review data.':'Open the dashboard to use these choices.';
  }
  function readTargetInputs(el){return Object.fromEntries(targetFields.map(k=>{const value=el.querySelector('[data-target-field="'+k+'"]').value;return [k,value===''?null:+value];}));}
  $('targetReviewForm').addEventListener('input',e=>{const row=e.target.closest('[data-target-key]');if(!row||!e.target.matches('[data-target-field]'))return;draftTargets.set(row.dataset.targetKey,readTargetInputs(row));row.querySelector('.target-row-heading span').textContent='Edited';row.querySelector('[data-undo-target]').hidden=false;updateFinishNote();});
  $('targetReviewForm').addEventListener('click',e=>{
    const el=e.target.closest('[data-target-key]');if(!el)return;const key=el.dataset.targetKey,row=targetRows.find(r=>r.key===key),entry=e.target.closest('[data-use-entry]');
    if(entry){const target=row.entries[+entry.dataset.useEntry].target;for(const k of targetFields)el.querySelector('[data-target-field="'+k+'"]').value=target[k]??'';draftTargets.set(key,{...target});el.querySelector('.target-row-heading span').textContent='Edited';el.querySelector('[data-undo-target]').hidden=false;updateFinishNote();}
    if(e.target.closest('[data-undo-target]')){draftTargets.delete(key);el.outerHTML=targetRowHtml(row);updateFinishNote();}
  });
  $('targetReviewForm').onsubmit=e=>{
    e.preventDefault();if(!setup)return;
    for(const [key,t]of draftTargets){if(!M.valid(t)||!Number.isInteger(t.rounds)||t.rounds>1000||t.reading>1440||t.hearing>1440){$('targetError').textContent='Complete the three positive target values for '+targetRows.find(r=>r.key===key).name+', or undo that edit to leave it unresolved.';return;}}
    acceptReview();toast('Data loaded.');
  };
  function acceptReview(){
    setup.workspace.confirmLinks(draftLinks);
    for(const [key,t]of draftTargets){const row=targetRows.find(r=>r.key===key);if(row.group)setup.workspace.confirmTarget(row.group,t);else setup.workspace.manual[row.person]={...t};}
    applySetup();
  }
  function applySetup(){
    const accepted=setup;workspace=accepted.workspace;data=accepted.data;googleConfig=accepted.config;commitChanges();setup=null;draftTargets.clear();sources.close();
  }

  function renderValues(){
    const rows=prepared.flags.filter(f=>f.type.startsWith('Check ')),corrected=Object.entries(workspace.corrections).flatMap(([row,fields])=>Object.keys(fields).map(field=>({row:+row,field})));
    $('valueRows').innerHTML=rows.map(f=>'<div class="value-row"><span><strong>'+esc(f.name)+'</strong> · row '+f.row+'<br>'+esc(f.message)+'</span><button class="text-button" type="button" data-value-row="'+f.row+'" data-value-field="'+esc(f.type.slice(6))+'">Clarify</button></div>').join('')+(rows.length?'':'<p>No unclear practice values remain.</p>')+(corrected.length?'<h3>Corrections in this tab</h3>'+corrected.map(c=>'<div class="value-row"><span>Row '+c.row+' · '+esc(c.field)+' → '+esc(rawText(workspace.corrections[c.row][c.field]))+'</span><button class="text-button" data-value-row="'+c.row+'" data-value-field="'+c.field+'">Review</button></div>').join(''):'');
  }
  function showValues(){renderValues();if(!values.open)values.showModal();}
  function showValue(row,field){
    const r=data.rows.find(r=>r.row===row);if(!r)return;activeValue={row,field};const quantity=['reading','hearing'].includes(field),clock=['sleep','wake'].includes(field);
    $('valueOriginal').textContent=r.name+' · '+field+' · source row '+row+' · original: '+rawText(r.original?.[field]?.value??r[field]);
    const input=$('correctedValue');input.type=clock?'time':'number';input.step=clock?'60':field==='rounds'?'1':'any';if(!clock){input.min='0';input.max=field==='rounds'?'100000':'1440';}else{input.removeAttribute('min');input.removeAttribute('max');}
    const old=workspace.corrections[row]?.[field],parsed=old===undefined?null:E.interpret(field,old).value;
    input.value=parsed===null?'':clock?String(Math.floor(parsed/60)).padStart(2,'0')+':'+String(Math.round(parsed%60)).padStart(2,'0'):parsed;
    $('valueLabel').firstChild.textContent=clock?'Clock time (24-hour)':quantity?'Duration in minutes':'Number of rounds';$('sameValues').checked=false;$('valueError').textContent='';$('resetValue').hidden=old===undefined;valueDialog.showModal();
  }
  $('valueForm').onsubmit=e=>{e.preventDefault();const {row,field}=activeValue;try{const value=['reading','hearing'].includes(field)?{kind:'minutes',value:+$('correctedValue').value}:field==='rounds'?+$('correctedValue').value:$('correctedValue').value;workspace.correct(row,field,value,$('sameValues').checked);commitChanges();renderValues();valueDialog.close();toast('Value clarified in this tab.');}catch(error){$('valueError').textContent=error.message;}};
  $('resetValue').onclick=()=>{delete workspace.corrections[activeValue.row][activeValue.field];commitChanges();renderValues();valueDialog.close();};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-open-review]');if(b)(b.dataset.openReview==='setup'?reviewCurrent:showValues)();const v=e.target.closest('[data-value-row]');if(v)showValue(+v.dataset.valueRow,v.dataset.valueField);});

  function initializeGoogle(){
    if(!/^https?:$/.test(location.protocol)){$('googleStatus').textContent='Google sign-in needs the hosted dashboard or localhost. Choose Local files here.';return;}
    if(tokenClient&&pickerReady){setBusy(false);return;}
    $('googleStatus').textContent='Loading Google sign-in and file picker…';
    P.ready().then(()=>{pickerReady=true;setBusy(false);if(tokenClient)$('googleStatus').textContent=hasGoogleToken()?'Load the two sheets shown below, or change either selection.':'Sign in to load the two sheets shown below.';}).catch(error=>{$('googleStatus').textContent=error.message;});
    if(tokenClient||$('googleIdentityScript'))return;
    const script=document.createElement('script');script.id='googleIdentityScript';script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onload=()=>{
      tokenClient=google.accounts.oauth2.initTokenClient({client_id:G.CLIENT_ID,scope:G.SCOPE,include_granted_scopes:false,
        error_callback:()=>{authorizationGeneration=null;pendingRole=null;setBusy(false);$('googleStatus').textContent='The Google popup did not complete. Allow popups and try again.';},
        callback:response=>{
          if(authorizationGeneration!==generation){delete response.access_token;return;}
          authorizationGeneration=null;
          if(response.error||!response.access_token){pendingRole=null;setBusy(false);$('googleStatus').textContent='Google authorization was not completed. Check account access and app availability.';return;}
          const granted=(response.scope||G.SCOPE).split(/\s+/);
          if(!granted.includes(G.SCOPE)||granted.some(scope=>!['openid','email','profile','https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/userinfo.profile',G.SCOPE].includes(scope))){
            delete response.access_token;pendingRole=null;googleToken=null;expires=0;setBusy(false);
            $('googleStatus').textContent='Google returned permissions beyond selected files. Remove this app’s previous access at myaccount.google.com/connections, then sign in again.';return;
          }
          googleToken=response.access_token;expires=Date.now()+(Number(response.expires_in)||300)*1000-30000;delete response.access_token;
          // Selections express the mentor's intent, not permission. Each read is
          // authorized by Google for the newly signed-in account.
          accessNeeded=false;showSelections();$('googleDisconnect').hidden=false;setBusy(false);
          const role=pendingRole;pendingRole=null;
          if(role)pickSheet(role);else $('googleStatus').textContent='Signed in. Load the two sheets shown below, or change either selection.';
        }
      });setBusy(false);if(pickerReady)$('googleStatus').textContent='Sign in to load the two sheets shown below.';
    };
    script.onerror=()=>{script.remove();$('googleStatus').textContent='Google sign-in could not load. Choose Google Sheets again to retry, or use Local files.';};document.head.append(script);
  }
  function authorize(role=null){
    if(!tokenClient||!pickerReady){$('googleStatus').textContent='Google sign-in and file picker are not ready. Try Google Sheets again.';return;}
    pendingRole=role;authorizationGeneration=generation;setBusy(true);$('googleStatus').textContent='Choose your Google account and approve access to files you select.';
    try{tokenClient.requestAccessToken();}catch(error){authorizationGeneration=null;pendingRole=null;setBusy(false);$('googleStatus').textContent=error.message;}
  }
  async function pickSheet(role){
    if(!hasGoogleToken())return authorize(role);
    cancelRead();const current=generation;controller=new AbortController();const signal=controller.signal;let loadAfter=false;
    const approving=role==='access',ids=approving?[selectedSheets.responses.id,selectedSheets.prescriptions.id]:null;
    // Picker is outside the native dialog; close that dialog so its top layer cannot cover Google.
    skipPickerClose=true;sources.close();setBusy(true);
    try{
      const file=await P.choose(googleToken,approving?'Allow access to both selected sheets':role==='responses'?'Choose the daily response sheet':'Choose the personal prescription sheet',signal,approving?{fileIds:ids,multiple:true}:{});
      if(current!==generation)return;
      if(file){
        if(approving){
          if(file.length!==2||new Set(file.map(f=>f.id)).size!==2||!ids.every(id=>file.some(f=>f.id===id)))throw new Error('Select both sheets shown in the dashboard. If one is missing, ask its owner to share it with this Google account, or use Change to choose another sheet.');
          // Bind roles by ID, never by the order Google returns the files.
          for(const sheet of Object.values(selectedSheets))sheet.name=file.find(f=>f.id===sheet.id).name;
          accessNeeded=false;loadAfter=true;
        }else{
          const other=role==='responses'?'prescriptions':'responses';
          if(file.id===selectedSheets[other]?.id)throw new Error('Choose two different spreadsheets: one for responses and one for prescriptions.');
          selectedSheets[role]=file;accessNeeded=false;
        }
        showSelections();
      }
      $('googleStatus').textContent=file?'Selected sheets are ready to load.':'Selection cancelled. Your previous selection is unchanged.';
    }catch(error){if(current===generation&&error.name!=='AbortError')$('googleStatus').textContent=error.message;}
    finally{if(current===generation){controller=null;if(!sources.open)sources.showModal();setBusy(false);}}
    if(loadAfter&&current===generation)readGoogle(refreshRequested);
  }
  $('pickResponses').onclick=()=>pickSheet('responses');$('pickPrescriptions').onclick=()=>pickSheet('prescriptions');
  $('googleApprove').onclick=()=>pickSheet('access');
  async function readGoogle(asRefresh=false){
    let config;try{config=currentConfig();S.sheetId(config.responses);S.sheetId(config.prescriptions);}catch(e){$('googleStatus').textContent=e.message;return;}
    if(!googleToken||Date.now()>=expires){googleToken=null;$('googleStatus').textContent='Continue with Google to load both sheets.';return;}
    cancelRead();const current=generation;controller=new AbortController();const active=controller;let timedOut=false;const timer=setTimeout(()=>{timedOut=true;active.abort();},60000);setBusy(true);$('googleStatus').textContent='Reading both Google Sheets…';
    try{const pair=await G.readPair(config,googleToken,window.fetch.bind(window),controller.signal);if(current!==generation)return;accessNeeded=false;stagePair(pair,config,asRefresh);$('googleStatus').textContent='Both sources read successfully.';refreshRequested=false;}
    catch(e){if(current===generation&&(timedOut||e.name!=='AbortError')){accessNeeded=!timedOut&&[403,404].includes(e.status);$('googleStatus').textContent=(timedOut?'The read timed out. Try again.':e.message)+(accessNeeded?' Use Allow access to selected sheets to approve these two files in Google. If a sheet is missing there, this account needs access from its owner.':'')+(workspace.responses?' Previously loaded data has been kept.':'');if(/authorization expired/i.test(e.message)){googleToken=null;expires=0;}}}
    finally{clearTimeout(timer);if(current===generation){controller=null;setBusy(false);updateStatus();}}
  }
  $('googleSourcesForm').onsubmit=e=>{e.preventDefault();if(!hasGoogleToken())authorize();else readGoogle(refreshRequested);};
  $('googleDisconnect').onclick=()=>{cancelRead();googleToken=null;expires=0;selectedSheets=defaultSheets();accessNeeded=false;showSelections();setBusy(false);$('googleDisconnect').hidden=true;$('googleStatus').textContent='Google access token forgotten in this tab. Loaded data is retained. You can revoke the app permission in your Google Account.';};
  refresh.onclick=()=>{
    const config=googleConfig;openSources('google');refreshRequested=true;
    if(config){selectedSheets={responses:{id:config.responses,name:config.responseName},prescriptions:{id:config.prescriptions,name:config.prescriptionName}};showSelections();$('responseTab').value=config.responseTab;$('prescriptionTab').value=config.prescriptionTab;}
    if(hasGoogleToken())readGoogle(true);else{$('googleStatus').textContent='Authorization expired. Sign in again to refresh the sheets shown below. Loaded data is retained.';setBusy(false);}
  };
  sources.addEventListener('close',()=>{if(skipPickerClose){skipPickerClose=false;return;}cancelRead();setup=null;draftLinks.clear();draftTargets.clear();selectedGroup=null;refreshRequested=false;});
  $('chooseLocal').onclick=()=>chooseMethod('local');$('chooseGoogle').onclick=()=>chooseMethod('google');
  $('importResponses').onclick=()=>openSources();$('startLocal').onclick=()=>openSources('local');$('startGoogle').onclick=()=>openSources('google');header.onclick=reviewCurrent;$('reviewSetup').onclick=reviewCurrent;$('reviewValues').onclick=showValues;
  window.addEventListener('sadhana:render',updateStatus);
  window.addEventListener('sadhana:clear',()=>{cancelRead();googleToken=null;expires=0;googleConfig=null;selectedSheets=defaultSheets();accessNeeded=false;showSelections();setup=null;activeValue=null;$('googleDisconnect').hidden=true;$('googleSourcesForm').reset();$('localSourcesForm').reset();$('googleStatus').textContent='This tab has been cleared.';for(const d of [sources,values,valueDialog])if(d.open)d.close();updateStatus();});
  updateStatus();
})();
