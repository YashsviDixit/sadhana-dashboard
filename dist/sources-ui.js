'use strict';
(function(){
  const S=window.SadhanaSources,M=window.SadhanaMatching,G=window.SadhanaGoogleSheets;
  const defaultSheets=Object.freeze({
    responses:'https://docs.google.com/spreadsheets/d/11-ERIq__kEYRs4EixazJ2K_8ZY2dCxEqpv3HWBsoSdc/edit',
    prescriptions:'https://docs.google.com/spreadsheets/d/1Rx3ktV2hVsnmHFNMyFtNUYudigXXYiH2qizJE_IPdnU/edit'
  });
  const targetFields=['rounds','reading','hearing'];
  const rawText=E.displayRaw;
  const targetText=t=>M.valid(t||{})?t.rounds+' rounds · '+t.reading+' min reading · '+t.hearing+' min hearing':'Targets need clarification';
  let googleToken=null,expires=0,tokenClient=null,controller=null,generation=0,authorizationGeneration=null,googleConfig=null;
  let setup=null,draftLinks=new Map(),draftTargets=new Map(),targetRows=[],draggedGroup=null,activeValue=null,refreshRequested=false;

  function addDialog(id,title,body){
    const d=document.createElement('dialog');d.id=id;d.className='source-dialog';d.setAttribute('aria-labelledby',id+'Title');
    d.innerHTML='<div class="dialog-top"><h2 id="'+id+'Title" tabindex="-1">'+title+'</h2><button class="close-button" data-close="'+id+'" aria-label="Close '+title.toLowerCase()+'">×</button></div><div class="source-body">'+body+'</div>';
    document.body.append(d);return d;
  }
  const sources=addDialog('sourcesDialog','Load your data',`
    <ol class="setup-steps" aria-label="Setup progress"><li data-step="sources">1 · Sources</li><li data-step="names">2 · Names</li><li data-step="targets">3 · Targets</li></ol>
    <section id="sourceStage">
      <p>Choose how to load the same two sources: daily responses and personal prescriptions.</p>
      <div class="source-methods" role="group" aria-label="Choose data source"><button id="chooseLocal" type="button"><strong>Local files</strong><span>Select two Excel or CSV files</span></button><button id="chooseGoogle" type="button"><strong>Google Sheets</strong><span>Read both sheets using your Google account</span></button></div>
      <form id="localSourcesForm" hidden><div class="source-file-grid"><label id="localResponseSlot">Daily responses</label><label>Personal prescriptions<input id="prescriptionUpload" required type="file" accept=".xlsx,.xls,.csv"></label></div><p>Keep the original column headings in each file. Both files are required; calculated score columns are ignored.</p><button class="import-button" type="submit">Load files & review</button><p id="localStatus" role="alert"></p></form>
      <form id="googleSourcesForm" hidden>
        <label>Daily response sheet<input id="responseSheet" required type="password" value="${esc(defaultSheets.responses)}" autocomplete="off" spellcheck="false"></label>
        <label>Personal prescription sheet<input id="prescriptionSheet" required type="password" value="${esc(defaultSheets.prescriptions)}" autocomplete="off" spellcheck="false"></label>
        <p>The masked links are prefilled. Replace them only to use different sheets.</p>
        <details><summary>Worksheet names · only if needed</summary><label>Response worksheet<input id="responseTab" placeholder="Automatic"></label><label>Prescription worksheet<input id="prescriptionTab" placeholder="Automatic"></label></details>
        <div class="setup-actions"><button id="googleConnect" class="import-button" type="submit" disabled>Continue with Google</button><button id="googleDisconnect" class="text-button" type="button" hidden>Forget Google access</button></div><p id="googleStatus" role="status" aria-live="polite"></p>
      </form>
      <div id="loadedSources" hidden><div id="sourceStatus" class="source-status-list"></div><div class="setup-actions"><button id="reviewSetup" class="text-button" type="button">Review names & targets</button><button id="reviewValues" class="text-button" type="button">Clarify practice values</button></div></div>
      <p class="source-note">Data and confirmations stay in this tab. Reload clears them. Google access is read-only; no sheet is edited.</p>
    </section>
    <section id="nameStage" hidden>
      <p>Left: recorded response names. Right: prescribed names. Review suggestions, change anything needed, then confirm the whole list once.</p>
      <p id="matchStatus" role="status" aria-live="polite"></p>
      <div class="review-toolbar"><label>Find a response name<input id="matchSearch" type="search" placeholder="Search names"></label><label>Show<select id="matchFilter"><option value="attention">Suggestions & unmatched</option><option value="all">All names</option></select></label></div>
      <div class="matching-layout"><details class="prescription-bank"><summary>Drag a name from the prescribed values</summary><label>Find a name in prescribed values<input id="prescriptionSearch" type="search" placeholder="Search names"></label><div id="prescriptionCards"></div></details><div id="matchRows" role="group" aria-label="Recorded response names matched to prescribed value names"></div></div>
      <p id="nameFootnote" class="source-note"></p><div class="wizard-actions"><button id="backToSources" class="text-button" type="button">Back</button><button id="confirmMatches" class="import-button" type="button">Confirm matches & continue</button></div>
    </section>
    <section id="targetStage" hidden>
      <p>Clear values have been converted automatically. Only new, unclear or conflicting prescriptions need your input.</p>
      <p id="targetStatus" role="status" aria-live="polite"></p>
      <form id="targetReviewForm" novalidate><div id="targetAttention"></div><details id="readyTargets"><summary>Ready targets · review or edit</summary><div id="targetReady"></div></details><p id="targetError" role="alert"></p><p id="finishNote" class="source-note"></p><div class="wizard-actions"><button id="backToNames" class="text-button" type="button">Back to names</button><button class="import-button" type="submit">Open dashboard</button></div></form>
      <p class="source-note">Confirmed current targets apply across the selected history. Unresolved targets remain unavailable.</p>
    </section>
  `);
  const input=$('upload');input.hidden=false;input.required=true;$('localResponseSlot').append(input);
  const values=addDialog('valuesDialog','Unclear practice values',`<p>Clarify values without editing the original response. Corrections apply to this tab only.</p><div id="valueRows"></div>`);
  const valueDialog=addDialog('valueDialog','Clarify a practice value',`
    <p id="valueOriginal"></p><form id="valueForm"><label id="valueLabel">Correct value<input id="correctedValue" required></label><label class="source-checkbox"><input id="sameValues" type="checkbox"> Also use for identical values in this field in the loaded response source</label><div class="setup-actions"><button class="import-button" type="submit">Confirm value</button><button id="resetValue" class="text-button" type="button">Use original value</button></div><p id="valueError" role="alert"></p></form>
  `);
  const header=document.createElement('button');header.id='dataSources';header.className='text-button';header.textContent='Review setup';header.hidden=true;$('importResponses').before(header);
  const refresh=document.createElement('button');refresh.id='refreshSheets';refresh.className='text-button';refresh.textContent='Refresh sheets';refresh.hidden=true;header.after(refresh);
  $('importSetup').querySelector('h2').textContent='Choose how to load your data';
  const start=document.createElement('div');start.className='source-start-actions';start.innerHTML='<button id="startLocal" class="import-button" type="button">Local files</button><button id="startGoogle" class="import-button secondary" type="button">Google Sheets</button>';$('importSetup').append(start);
  const banner=document.createElement('div');banner.id='sourceReview';banner.className='source-review';banner.hidden=true;$('cards').before(banner);

  function currentConfig(){return {responses:$('responseSheet').value.trim(),prescriptions:$('prescriptionSheet').value.trim(),responseTab:$('responseTab').value.trim(),prescriptionTab:$('prescriptionTab').value.trim()};}
  function setBusy(busy){
    for(const el of sources.querySelectorAll('button,input,select'))el.disabled=busy;
    $('googleConnect').disabled=busy||!tokenClient;refresh.disabled=busy;
  }
  function cancelRead(){generation++;controller?.abort();controller=null;setBusy(false);}
  function stepTo(step){
    for(const [id,s]of [['sourceStage','sources'],['nameStage','names'],['targetStage','targets']])$(id).hidden=s!==step;
    sources.querySelectorAll('[data-step]').forEach(el=>el.setAttribute('aria-current',el.dataset.step===step?'step':'false'));
    $('sourcesDialogTitle').textContent={sources:'Load your data',names:'Match names',targets:'Review personal targets'}[step];sources.scrollTop=0;$('sourcesDialogTitle').focus();
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
    banner.innerHTML='<span>'+targetCount+' students need targets · '+valueCount+' practice values need clarification.</span><button class="text-button" data-open-review="setup">Review setup</button><button class="text-button" data-open-review="values">Review values</button>';
  }
  function commitChanges(){syncWorkspace();render();if($('studentDialog').open)student(activeStudent);}
  function stagePair(pair,config,asRefresh=false){
    const next=workspace.copy();next.setResponses(pair.responses.rows,pair.responses);next.setPrescriptions(pair.prescriptions.rows,pair.prescriptions);
    const sameResponse=workspace.responses?.key===pair.responses.key;
    const nextData={...data,source:pair.responses.title,rows:pair.responses.rows,prescriptions:pair.prescriptions.rows,roster:sameResponse||!workspace.responses?data.roster:[]};
    const nextPrepared=E.prepare({...nextData,valueOverrides:next.corrections});next.targets(nextPrepared.names);
    setup={workspace:next,data:nextData,prepared:nextPrepared,config};draftLinks=M.proposals(nextPrepared.names,next.groups,next.links);draftTargets.clear();
    // Refreshes keep accepted setup when no new identity or target issue appeared.
    const nextTargets=next.targets(nextPrepared.names);
    const identityReview=[...nextPrepared.names.keys()].some(id=>!next.links.has(id));
    const targetReview=[...nextPrepared.names.keys()].some(id=>!M.valid(nextTargets[id])&&(M.valid(targets[id]||{})||!prepared.names.has(id)));
    if(asRefresh&&sameResponse&&workspace.prescriptions?.key===pair.prescriptions.key){
      if(!identityReview&&!targetReview){applySetup();toast('Both sheets refreshed. Confirmed setup has been kept.');return;}
      if(!identityReview){buildTargetRows();renderTargets();stepTo('targets');return;}
    }
    $('matchSearch').value='';$('matchFilter').value='attention';$('prescriptionSearch').value='';sources.querySelector('.prescription-bank').open=false;sources.querySelector('.matching-layout').classList.remove('bank-open');renderMatches();stepTo('names');
  }
  function reviewCurrent(){
    if(!workspace.responses||!workspace.prescriptions)return openSources();
    stagePair({responses:workspace.responses,prescriptions:workspace.prescriptions},googleConfig);if(!sources.open)sources.showModal();
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

  function attention(id){const p=draftLinks.get(id),old=setup.workspace.links.get(id);return !old||p.group!==old.group;}
  function matchSummary(){
    const all=[...draftLinks],exact=all.filter(([,p])=>p.origin==='exact').length,suggested=all.filter(([,p])=>p.origin==='suggested').length,ambiguous=all.filter(([,p])=>p.origin==='ambiguous').length,missing=all.filter(([,p])=>p.group===null).length;
    $('matchStatus').textContent=exact+' exact matches · '+suggested+' suggestions'+(ambiguous?' · '+ambiguous+' need a choice':'')+' · '+missing+' without a selected prescription';
    $('nameFootnote').textContent=missing?missing+' names have no selected prescription. Their targets will stay unavailable unless clarified in the next step.':'All names have a selected prescription. One confirmation applies to the whole list, including names hidden by search.';
  }
  function renderMatches(){
    if(!setup)return;matchSummary();
    const query=$('matchSearch').value.trim().toLowerCase(),all=[...setup.workspace.groups.values()].sort((a,b)=>a.name.localeCompare(b.name));
    const people=[...setup.prepared.names].filter(([id,name])=>name.toLowerCase().includes(query)&&($('matchFilter').value==='all'||attention(id)));
    const headings='<div class="match-column-headings" aria-hidden="true"><span>Name in recorded responses</span><span>Name in prescribed values</span></div>';
    $('matchRows').innerHTML=headings+(people.map(([id,name],index)=>{
      const p=draftLinks.get(id),g=setup.workspace.groups.get(p.group),t=g?(setup.workspace.resolved.get(g.id)||g.target):null;
      const state={exact:'Exact match',confirmed:'Previously confirmed',suggested:'Suggested match',ambiguous:'Choose a prescribed name',unmatched:'No match found',changed:'Changed'}[p.origin];
      const candidateIDs=new Set((p.candidates||[]).map(c=>c.id));
      const option=g=>'<option value="'+esc(g.id)+'" '+(p.group===g.id?'selected':'')+'>'+esc(g.name)+'</option>';
      const options=candidateIDs.size&&!['exact','confirmed'].includes(p.origin)?'<optgroup label="Suggested names">'+p.candidates.map(c=>setup.workspace.groups.get(c.id)).filter(Boolean).map(option).join('')+'</optgroup><optgroup label="Other names in prescribed values">'+all.filter(g=>!candidateIDs.has(g.id)).map(option).join('')+'</optgroup>':all.map(option).join('');
      return '<article class="match-row" data-match-person="'+esc(id)+'"><div><span class="match-source-label">Recorded responses</span><strong>'+esc(name)+'</strong><span class="match-state">'+state+'</span></div><div><label class="match-source-label" for="matchChoice'+index+'">Prescribed values</label><select id="matchChoice'+index+'" aria-label="Name in prescribed values for '+esc(name)+'"><option value="" '+(p.group===null?'selected':'')+'>No matching prescribed name</option>'+options+'</select>'+(p.reason?'<small class="match-reason">'+esc(p.reason)+'</small>':'')+'<small class="match-target">'+esc(targetText(t))+'</small></div></article>';
    }).join('')||'<div class="review-empty">'+(query?'No names match this search.':'No suggestions need checking. Exact and previously confirmed matches are ready.')+' <button class="text-button" type="button" id="showAllMatches">View all names</button></div>');
    renderCards();
  }
  function renderCards(){
    if(!setup)return;const q=$('prescriptionSearch').value.toLowerCase().trim();
    $('prescriptionCards').innerHTML=[...setup.workspace.groups.values()].filter(g=>g.name.toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name)).map(g=>'<div class="prescription-card" draggable="true" data-prescription="'+esc(g.id)+'"><strong>'+esc(g.name)+'</strong><small>'+esc(targetText(setup.workspace.resolved.get(g.id)||g.target))+'</small></div>').join('');
  }
  function changeMatch(id,group){
    draftLinks.set(id,{group,origin:'changed'});
    const row=[...$('matchRows').querySelectorAll('[data-match-person]')].find(r=>r.dataset.matchPerson===id);
    if(row){row.querySelector('.match-state').textContent='Changed';const g=setup.workspace.groups.get(group);row.querySelector('.match-target').textContent=targetText(g&&(setup.workspace.resolved.get(group)||g.target));const reason=row.querySelector('.match-reason');if(reason)reason.textContent='Selected by you';}matchSummary();
  }
  $('matchSearch').oninput=renderMatches;$('matchFilter').onchange=renderMatches;$('prescriptionSearch').oninput=renderCards;
  $('matchRows').onchange=e=>{const row=e.target.closest('[data-match-person]');if(row)changeMatch(row.dataset.matchPerson,e.target.value||null);};
  sources.addEventListener('click',e=>{if(e.target.closest('#showAllMatches')){$('matchFilter').value='all';$('matchSearch').value='';renderMatches();}});
  sources.addEventListener('dragstart',e=>{const card=e.target.closest('[data-prescription]');if(card){draggedGroup=card.dataset.prescription;e.dataTransfer.setData('text/plain',draggedGroup);e.dataTransfer.effectAllowed='copy';}});
  sources.addEventListener('dragend',()=>{draggedGroup=null;});
  sources.addEventListener('dragover',e=>{if(draggedGroup&&e.target.closest('[data-match-person]'))e.preventDefault();});
  sources.addEventListener('drop',e=>{const row=e.target.closest('[data-match-person]'),id=draggedGroup;if(!row||!setup.workspace.groups.has(id))return;e.preventDefault();row.querySelector('select').value=id;changeMatch(row.dataset.matchPerson,id);row.querySelector('select').focus();draggedGroup=null;});
  $('confirmMatches').onclick=()=>{if(!setup)return;setup.workspace.confirmLinks(draftLinks);buildTargetRows();renderTargets();stepTo('targets');};
  $('backToSources').onclick=()=>stepTo('sources');$('backToNames').onclick=()=>{renderMatches();stepTo('names');};

  function buildTargetRows(){
    const w=setup.workspace,result=new Map();
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
    const draft=draftTargets.get(row.key),editing=!!draft||!row.ready,t=draft||row.base;
    const entryText=r=>targetFields.map(k=>k+': '+(r.target[k]===null?rawText(r.original?.[k]?.value??r.raw[k]):r.target[k]+(k==='rounds'?' rounds':' min'))).join(' · ');
    const entries=row.entries.length>1?'<label>Source entry<select data-target-entry><option value="">Choose an entry if needed</option>'+row.entries.map((r,i)=>'<option value="'+i+'">Row '+r.row+(r.timestamp?' · '+esc(String(r.timestamp).slice(0,10)):'')+' — '+esc(entryText(r))+'</option>').join('')+'</select></label>':'';
    const hint=k=>{
      if(row.base[k]!==null||!row.entries.length)return '';
      const originals=row.entries.map(r=>r.original?.[k]?.value??r.raw[k]);
      return '<small class="target-hint">'+esc(new Set(originals.map(v=>JSON.stringify(v))).size===1?'Original: '+rawText(originals[0]):'Source entries differ. Choose an entry or enter the confirmed value.')+'</small>';
    };
    const originals=row.entries.length?'<details class="target-originals"><summary>Original prescription'+(row.entries.length>1?' entries':'')+'</summary>'+row.entries.map(r=>'<p>Row '+r.row+' · '+targetFields.map(k=>esc(k)+': '+esc(rawText(r.original?.[k]?.value??r.raw[k]))).join(' · ')+'</p>').join('')+'</details>':'<p class="source-note">No prescription name is linked. You can enter confirmed targets or leave them unavailable.</p>';
    return '<article class="target-review-row" data-target-key="'+esc(row.key)+'"><div class="target-row-heading"><strong>'+esc(row.name)+'</strong><span>'+(draft?'Edited':row.ready?'Ready':'Needs clarification')+'</span></div><div class="target-display" '+(editing?'hidden':'')+'>'+esc(targetText(t))+' <button class="text-button" data-edit-target type="button">Edit</button></div><div class="target-editor" '+(!editing?'hidden':'')+'>'+entries+'<div class="source-target-inputs">'+targetFields.map(k=>'<label>'+({rounds:'Chanting rounds',reading:'Reading minutes',hearing:'Hearing minutes'})[k]+'<input data-target-field="'+k+'" type="number" min="0.01" max="'+(k==='rounds'?1000:1440)+'" step="'+(k==='rounds'?'1':'any')+'" value="'+(t[k]??'')+'">'+hint(k)+'</label>').join('')+'</div>'+originals+'<button class="text-button" data-undo-target type="button">Undo edit</button></div></article>';
  }
  function renderTargets(){
    const unclear=targetRows.filter(r=>!r.ready),ready=targetRows.filter(r=>r.ready);
    $('targetStatus').textContent=ready.length+' prescriptions ready · '+unclear.length+' need clarification';
    $('targetAttention').innerHTML=unclear.map(targetRowHtml).join('')||'<div class="review-empty">All personal targets are ready. No clarification is needed.</div>';
    $('targetReady').innerHTML=ready.map(targetRowHtml).join('');$('readyTargets').hidden=!ready.length;$('targetError').textContent='';updateFinishNote();
  }
  function updateFinishNote(){
    const remaining=targetRows.filter(r=>!r.ready&&!M.valid(draftTargets.get(r.key)||{})).length;
    $('finishNote').textContent=remaining?remaining+' prescriptions will remain unavailable if left unresolved. You can return to Review setup later.':'Targets are ready. Open the dashboard to apply this setup.';
  }
  function readTargetInputs(el){return Object.fromEntries(targetFields.map(k=>{const value=el.querySelector('[data-target-field="'+k+'"]').value;return [k,value===''?null:+value];}));}
  $('targetReviewForm').addEventListener('input',e=>{const row=e.target.closest('[data-target-key]');if(!row||!e.target.matches('[data-target-field]'))return;draftTargets.set(row.dataset.targetKey,readTargetInputs(row));row.querySelector('.target-row-heading span').textContent='Edited';updateFinishNote();});
  $('targetReviewForm').addEventListener('change',e=>{if(!e.target.matches('[data-target-entry]')||e.target.value==='')return;const row=e.target.closest('[data-target-key]'),model=targetRows.find(r=>r.key===row.dataset.targetKey),entry=model.entries[+e.target.value];for(const k of targetFields)row.querySelector('[data-target-field="'+k+'"]').value=entry.target[k]??'';draftTargets.set(model.key,{...entry.target});row.querySelector('.target-row-heading span').textContent='Edited';updateFinishNote();});
  $('targetReviewForm').addEventListener('click',e=>{
    const row=e.target.closest('[data-target-key]');if(!row)return;const key=row.dataset.targetKey,model=targetRows.find(r=>r.key===key);
    if(e.target.closest('[data-edit-target]')){draftTargets.set(key,{...model.base});row.querySelector('.target-editor').hidden=false;row.querySelector('.target-display').hidden=true;row.querySelector('input').focus();}
    if(e.target.closest('[data-undo-target]')){draftTargets.delete(key);row.outerHTML=targetRowHtml(model);updateFinishNote();}
  });
  $('targetReviewForm').onsubmit=e=>{
    e.preventDefault();if(!setup)return;
    for(const [key,t]of draftTargets){if(!M.valid(t)||!Number.isInteger(t.rounds)||t.rounds>1000||t.reading>1440||t.hearing>1440){$('targetError').textContent='Complete the three positive target values for '+targetRows.find(r=>r.key===key).name+', or undo that edit to leave it unresolved.';return;}}
    for(const [key,t]of draftTargets){const row=targetRows.find(r=>r.key===key);if(row.group)setup.workspace.confirmTarget(row.group,t);else setup.workspace.manual[row.person]={...t};}
    applySetup();toast('Data and personal targets are ready.');
  };
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
    if(tokenClient||$('googleIdentityScript'))return;$('googleStatus').textContent='Loading Google sign-in…';
    const script=document.createElement('script');script.id='googleIdentityScript';script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onload=()=>{
      tokenClient=google.accounts.oauth2.initTokenClient({client_id:G.CLIENT_ID,scope:G.SCOPE,include_granted_scopes:false,
        error_callback:()=>{setBusy(false);$('googleStatus').textContent='The Google popup did not complete. Allow popups and try again.';},
        callback:response=>{if(authorizationGeneration!==generation){delete response.access_token;return;}authorizationGeneration=null;setBusy(false);if(response.error||!response.access_token){$('googleStatus').textContent='Google authorization was not completed. Check account access and tester approval.';return;}googleToken=response.access_token;expires=Date.now()+(Number(response.expires_in)||300)*1000-30000;delete response.access_token;$('googleDisconnect').hidden=false;readGoogle(refreshRequested);}
      });setBusy(false);$('googleStatus').textContent='Ready. Continue with Google to read both configured sheets.';
    };
    script.onerror=()=>{script.remove();$('googleStatus').textContent='Google sign-in could not load. Choose Google Sheets again to retry, or use Local files.';};document.head.append(script);
  }
  async function readGoogle(asRefresh=false){
    let config;try{config=currentConfig();S.sheetId(config.responses);S.sheetId(config.prescriptions);}catch(e){$('googleStatus').textContent=e.message;return;}
    if(!googleToken||Date.now()>=expires){googleToken=null;$('googleStatus').textContent='Continue with Google to load both sheets.';return;}
    cancelRead();const current=generation;controller=new AbortController();const active=controller;let timedOut=false;const timer=setTimeout(()=>{timedOut=true;active.abort();},60000);setBusy(true);$('googleStatus').textContent='Reading both Google Sheets…';
    try{const pair=await G.readPair(config,googleToken,window.fetch.bind(window),controller.signal);if(current!==generation)return;stagePair(pair,config,asRefresh);$('googleStatus').textContent='Both sources read successfully.';refreshRequested=false;}
    catch(e){if(current===generation&&(timedOut||e.name!=='AbortError')){$('googleStatus').textContent=(timedOut?'The read timed out. Try again.':e.message)+' Previously loaded data has been kept.';if(/authorization expired/i.test(e.message)){googleToken=null;expires=0;}}}
    finally{clearTimeout(timer);if(current===generation){controller=null;setBusy(false);updateStatus();}}
  }
  $('googleSourcesForm').onsubmit=e=>{e.preventDefault();try{const c=currentConfig();S.sheetId(c.responses);S.sheetId(c.prescriptions);if(!tokenClient)throw new Error('Google sign-in is not ready.');if(googleToken&&Date.now()<expires)readGoogle(refreshRequested);else{authorizationGeneration=generation;setBusy(true);$('googleStatus').textContent='Choose your Google account and approve read-only access.';tokenClient.requestAccessToken();}}catch(error){setBusy(false);$('googleStatus').textContent=error.message;}};
  $('googleDisconnect').onclick=()=>{cancelRead();googleToken=null;expires=0;$('googleDisconnect').hidden=true;$('googleStatus').textContent='Google access token forgotten in this tab. Loaded data is retained.';};
  refresh.onclick=()=>{
    const config=googleConfig;openSources('google');refreshRequested=true;
    if(config){$('responseSheet').value=config.responses;$('prescriptionSheet').value=config.prescriptions;$('responseTab').value=config.responseTab;$('prescriptionTab').value=config.prescriptionTab;}
    if(googleToken&&Date.now()<expires)readGoogle(true);else $('googleStatus').textContent='Authorization expired. Continue with Google to refresh both sheets.';
  };
  sources.addEventListener('close',()=>{cancelRead();setup=null;draftLinks.clear();draftTargets.clear();refreshRequested=false;});
  $('chooseLocal').onclick=()=>chooseMethod('local');$('chooseGoogle').onclick=()=>chooseMethod('google');
  sources.querySelector('.prescription-bank').addEventListener('toggle',e=>sources.querySelector('.matching-layout').classList.toggle('bank-open',e.target.open));
  $('importResponses').onclick=()=>openSources();$('startLocal').onclick=()=>openSources('local');$('startGoogle').onclick=()=>openSources('google');header.onclick=reviewCurrent;$('reviewSetup').onclick=reviewCurrent;$('reviewValues').onclick=showValues;
  window.addEventListener('sadhana:render',updateStatus);
  window.addEventListener('sadhana:clear',()=>{cancelRead();googleToken=null;expires=0;googleConfig=null;setup=null;activeValue=null;$('googleDisconnect').hidden=true;$('googleSourcesForm').reset();$('localSourcesForm').reset();$('googleStatus').textContent='This tab has been cleared.';for(const d of [sources,values,valueDialog])if(d.open)d.close();updateStatus();});
  updateStatus();
})();
