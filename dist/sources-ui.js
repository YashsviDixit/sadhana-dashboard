'use strict';
(function(){
  const S=window.SadhanaSources,M=window.SadhanaMatching,G=window.SadhanaGoogleSheets;
  const defaultSheets=Object.freeze({
    responses:'https://docs.google.com/spreadsheets/d/11-ERIq__kEYRs4EixazJ2K_8ZY2dCxEqpv3HWBsoSdc/edit',
    prescriptions:'https://docs.google.com/spreadsheets/d/1Rx3ktV2hVsnmHFNMyFtNUYudigXXYiH2qizJE_IPdnU/edit'
  });
  let googleToken=null,expires=0,tokenClient=null,controller=null,generation=0,authorizationGeneration=null,committing=false,googleConfig=null;
  let activeGroup=null,activeValue=null,draggedGroup=null;
  const rawText=v=>E.displayRaw(v),targetText=t=>t&&M.valid(t)?t.rounds+' rounds · '+t.reading+' min reading · '+t.hearing+' min hearing':'Targets need review';
  const addDialog=(id,title,body)=>{
    const d=document.createElement('dialog');d.id=id;d.className='source-dialog';d.setAttribute('aria-labelledby',id+'Title');
    d.innerHTML='<div class="dialog-top"><h2 id="'+id+'Title">'+title+'</h2><button class="close-button" data-close="'+id+'" aria-label="Close '+title.toLowerCase()+'">×</button></div><div class="source-body">'+body+'</div>';document.body.append(d);return d;
  };
  const sources=addDialog('sourcesDialog','Data sources',`
    <p>Load daily responses and personal prescriptions separately. Your account must have access to both Google Sheets.</p>
    <div id="sourceStatus" class="source-status-list" aria-live="polite"></div>
    <form id="googleSourcesForm">
      <label>Daily response sheet<input id="responseSheet" required type="password" value="${esc(defaultSheets.responses)}" placeholder="Google Sheets link" autocomplete="off" spellcheck="false"></label>
      <label>Personal prescription sheet<input id="prescriptionSheet" required type="password" value="${esc(defaultSheets.prescriptions)}" placeholder="Google Sheets link" autocomplete="off" spellcheck="false"></label>
      <p>Both sheets are preconfigured. You can replace the masked links for another group.</p>
      <details><summary>Choose worksheets · only if needed</summary><p>Leave blank to find the worksheet by its column headings.</p><label>Response worksheet<input id="responseTab" type="text" placeholder="Automatic"></label><label>Prescription worksheet<input id="prescriptionTab" type="text" placeholder="Automatic"></label></details>
      <p>Google access is read-only. Data, access tokens, matches and corrections stay in this tab; reload clears them.</p>
      <div class="setup-actions"><button id="googleConnect" class="import-button" type="submit" disabled>Continue with Google</button><button id="googleDisconnect" class="text-button" type="button" hidden>Forget Google access</button></div>
    </form><p id="googleStatus" role="status" aria-live="polite"></p>
    <details><summary>Use local files instead</summary><p>Use Import responses for the daily response export. Add the separate prescription export here; its headings must identify Name and Prescribed Chanting, Reading and Hearing.</p><button id="importPrescriptions" class="import-button secondary" type="button">Import prescriptions</button><input id="prescriptionUpload" type="file" accept=".xlsx,.xls,.csv" hidden><button id="removePrescriptions" class="text-button" type="button" hidden>Remove prescription source</button></details>
    <div class="setup-actions"><button id="reviewNames" class="text-button" type="button">Review names & targets</button><button id="reviewValues" class="text-button" type="button">Review unclear practice values</button></div>
    <p class="source-note">Confirmed current targets apply across your selected history. No Google Sheet is edited.</p>
  `);
  const names=addDialog('matchingDialog','Names & personal targets',`
    <p>Exact names match automatically. Suggestions need your confirmation. Choose a prescription name or drag a card onto a response row, then confirm. Changes apply in this tab.</p>
    <label>Find a response name<input id="matchSearch" type="search" placeholder="Search names"></label>
    <p id="matchStatus" role="status" aria-live="polite"></p><div class="matching-layout"><div id="matchRows"></div><aside class="prescription-bank"><h3>Prescription names</h3><label>Find a prescription<input id="prescriptionSearch" type="search" placeholder="Search names"></label><div id="prescriptionCards"></div></aside></div>
  `);
  const targetDialog=addDialog('prescriptionDialog','Review personal targets',`
    <p id="targetPerson"></p><label>Source entry<select id="prescriptionEntry"></select></label><p id="targetOriginal" class="source-note"></p>
    <form id="prescriptionForm"><div class="source-target-inputs"><label>Chanting rounds<input name="rounds" type="number" min="1" max="1000" step="1" required></label><label>Reading minutes<input name="reading" type="number" min="0.01" max="1440" step="any" required></label><label>Hearing minutes<input name="hearing" type="number" min="0.01" max="1440" step="any" required></label></div><p>Choose the applicable entry, or clarify its quantities here. This confirms the current targets across the selected history.</p><button class="import-button" type="submit">Confirm targets</button><button id="resetPrescription" class="text-button" type="button">Use source entries again</button><p id="prescriptionError" role="alert"></p></form>
  `);
  const values=addDialog('valuesDialog','Unclear practice values',`<p>Clarify values without editing the original response. Corrections apply to this tab only.</p><div id="valueRows"></div>`);
  const valueDialog=addDialog('valueDialog','Clarify a practice value',`
    <p id="valueOriginal"></p><form id="valueForm"><label id="valueLabel">Correct value<input id="correctedValue" required></label><label class="source-checkbox"><input id="sameValues" type="checkbox"> Also use for identical values in this field in the loaded response source</label><div class="setup-actions"><button class="import-button" type="submit">Confirm value</button><button id="resetValue" class="text-button" type="button">Use original value</button></div><p id="valueError" role="alert"></p></form>
  `);
  const header=document.createElement('button');header.id='dataSources';header.className='text-button';header.textContent='Data sources';$('importResponses').before(header);
  const start=document.createElement('button');start.className='import-button';start.textContent='Connect Google Sheets';$('importSetup').append(start);
  const refresh=document.createElement('button');refresh.id='refreshSheets';refresh.className='text-button';refresh.textContent='Refresh sheets';refresh.hidden=true;header.after(refresh);
  const banner=document.createElement('div');banner.id='sourceReview';banner.className='source-review';banner.hidden=true;$('cards').before(banner);
  function currentConfig(){return {responses:$('responseSheet').value.trim(),prescriptions:$('prescriptionSheet').value.trim(),responseTab:$('responseTab').value.trim(),prescriptionTab:$('prescriptionTab').value.trim()};}
  function cancelRead(){generation++;controller?.abort();controller=null;setBusy(false);}
  function setBusy(busy){for(const el of sources.querySelectorAll('input,button,select'))el.disabled=busy;$('googleConnect').disabled=busy||!tokenClient;refresh.disabled=busy;}
  function counts(){
    const unresolved=[...prepared.names.keys()].filter(id=>!workspace.links.has(id)).length;
    const targetCount=workspace.prescriptions?[...prepared.names.keys()].filter(id=>!M.valid(targets[id]||M.empty())).length:0;
    const valueCount=prepared.flags.filter(f=>f.type.startsWith('Check ')).length;
    return {unresolved,targetCount,valueCount};
  }
  function updateStatus(){
    const c=counts(),format=source=>source?esc(source.title)+(source.tab?' · '+esc(source.tab):'')+'<br><small>'+source.rows.length+' entries · loaded '+new Date(source.loadedAt).toLocaleString()+'</small>':'Not loaded';
    $('sourceStatus').innerHTML='<div><strong>Daily responses</strong><span>'+format(workspace.responses)+'</span></div><div><strong>Personal prescriptions</strong><span>'+format(workspace.prescriptions)+'</span></div>';
    $('removePrescriptions').hidden=!workspace.prescriptions;$('reviewNames').disabled=!workspace.prescriptions||!prepared.names.size;
    refresh.hidden=!(workspace.responses?.kind==='google'&&workspace.prescriptions?.kind==='google'&&googleConfig);
    const hasReview=workspace.prescriptions&&c.targetCount||c.valueCount;
    banner.hidden=!data.rows.length||view==='help'||!hasReview;
    banner.innerHTML='<span>'+ (workspace.prescriptions?c.targetCount+' students need personal targets. ':'')+c.valueCount+' practice values need clarification.</span><button class="text-button" data-open-review="names" '+(!workspace.prescriptions?'hidden':'')+'>Review names & targets</button><button class="text-button" data-open-review="values">Review values</button>';
  }
  function commitChanges(){syncWorkspace();render();if($('studentDialog').open)student(activeStudent);updateStatus();}
  function showNames(){renderMatches();if(!names.open)names.showModal();}
  function renderMatches(){
    const query=$('matchSearch').value.trim().toLowerCase(),c=counts();
    $('matchStatus').textContent=c.unresolved+' names await confirmation · '+c.targetCount+' students need targets.';
    const all=[...workspace.groups.values()].sort((a,b)=>a.name.localeCompare(b.name));
    const people=[...prepared.names].filter(([,name])=>name.toLowerCase().includes(query)).sort((a,b)=>Number(workspace.links.has(a[0]))-Number(workspace.links.has(b[0]))||a[1].localeCompare(b[1]));
    $('matchRows').innerHTML=people.map(([id,name])=>{
      const link=workspace.links.get(id),suggestions=M.suggestions(name,workspace.groups),selected=link?link.group:suggestions[0]?.id;
      const g=workspace.groups.get(link?.group),t=workspace.resolved.get(g?.id)||g?.target;
      return '<article class="match-row" data-match-person="'+esc(id)+'"><strong>'+esc(name)+'</strong><span class="match-state">'+(link?link.group===null?'No matching prescription':link.origin==='exact'?'Exact match':'Confirmed match':'Suggestion · not confirmed')+'</span><div class="match-choice"><select aria-label="Prescription name for '+esc(name)+'"><option value="" '+(selected==null?'selected':'')+'>No matching prescription</option>'+all.map(g=>'<option value="'+esc(g.id)+'" '+(selected===g.id?'selected':'')+'>'+esc(g.name)+(suggestions.some(s=>s.id===g.id)&&!link?' · suggested':'')+'</option>').join('')+'</select><button class="import-button secondary" data-confirm-match type="button">Confirm</button></div><small>'+esc(workspace.manual[id]?'Using manually confirmed targets: '+targetText(workspace.manual[id]):g?targetText(t):'Personal targets unavailable')+'</small><button class="text-button" data-edit-target type="button">Review targets</button></article>';
    }).join('')||'<p>No response names match this search.</p>';
    renderCards();
  }
  function renderCards(){const q=$('prescriptionSearch').value.toLowerCase().trim();$('prescriptionCards').innerHTML=[...workspace.groups.values()].filter(g=>g.name.toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name)).map(g=>'<div class="prescription-card" draggable="true" data-prescription="'+esc(g.id)+'"><strong>'+esc(g.name)+'</strong><small>'+esc(targetText(workspace.resolved.get(g.id)||g.target))+'</small><button class="text-button" type="button" data-bank-target="'+esc(g.id)+'">Review targets</button></div>').join('');}
  function showTarget(group){
    const g=workspace.groups.get(group);if(!g){toast('Choose a prescription name first.');return;}activeGroup=group;$('targetPerson').textContent=g.name;
    $('prescriptionEntry').innerHTML='<option value="">Choose a source entry or enter confirmed targets</option>'+g.entries.map((r,i)=>'<option value="'+i+'">Row '+r.row+(r.timestamp?' · '+r.timestamp.replace('T',' '):'')+'</option>').join('');
    const t=workspace.resolved.get(group)||g.target;fillTarget(t||M.empty());$('targetOriginal').textContent='';$('prescriptionError').textContent='';targetDialog.showModal();
  }
  function fillTarget(t){for(const field of ['rounds','reading','hearing'])$('prescriptionForm').elements[field].value=t[field]??'';}
  $('prescriptionEntry').onchange=()=>{const g=workspace.groups.get(activeGroup),r=g?.entries[+$('prescriptionEntry').value];if($('prescriptionEntry').value===''||!r){fillTarget(M.empty());$('targetOriginal').textContent='';return;}fillTarget(r.target);$('targetOriginal').textContent='Original: '+['rounds','reading','hearing'].map(k=>k+': '+rawText(r.original?.[k]?.value??r.raw[k])).join(' · ');};
  $('prescriptionForm').onsubmit=e=>{e.preventDefault();try{const f=new FormData(e.target);workspace.confirmTarget(activeGroup,Object.fromEntries(['rounds','reading','hearing'].map(k=>[k,+f.get(k)])));commitChanges();renderMatches();targetDialog.close();toast('Personal targets confirmed for this tab.');}catch(error){$('prescriptionError').textContent=error.message;}};
  $('resetPrescription').onclick=()=>{workspace.resolved.delete(activeGroup);commitChanges();renderMatches();targetDialog.close();};
  function renderValues(){
    const rows=prepared.flags.filter(f=>f.type.startsWith('Check '));
    const corrected=Object.entries(workspace.corrections).flatMap(([row,fields])=>Object.keys(fields).map(field=>({row:+row,field})));
    $('valueRows').innerHTML=rows.map(f=>'<div class="value-row"><span><strong>'+esc(f.name)+'</strong> · row '+f.row+'<br>'+esc(f.message)+'</span><button type="button" class="text-button" data-value-row="'+f.row+'" data-value-field="'+esc(f.type.slice(6))+'">Clarify</button></div>').join('')+(rows.length?'':'<p>No unclear practice values remain.</p>')+(corrected.length?'<h3>Corrections in this tab</h3>'+corrected.map(c=>'<div class="value-row"><span>Row '+c.row+' · '+esc(c.field)+' → '+esc(rawText(workspace.corrections[c.row][c.field]))+'</span><button class="text-button" data-value-row="'+c.row+'" data-value-field="'+c.field+'">Review</button></div>').join(''):'');
  }
  function showValues(){renderValues();if(!values.open)values.showModal();}
  function showValue(row,field){
    const r=data.rows.find(r=>r.row===row);if(!r)return;activeValue={row,field};const quantity=['reading','hearing'].includes(field),clock=['sleep','wake'].includes(field);
    $('valueOriginal').textContent=r.name+' · '+field+' · source row '+row+' · original: '+rawText(r.original?.[field]?.value??r[field]);
    const input=$('correctedValue');input.type=clock?'time':'number';input.step=clock?'60':field==='rounds'?'1':'any';if(!clock){input.min='0';input.max=field==='rounds'?'100000':'1440';}else{input.removeAttribute('min');input.removeAttribute('max');}
    const old=workspace.corrections[row]?.[field],parsed=old===undefined?null:E.interpret(field,old).value;
    input.value=parsed===null?'':clock?String(Math.floor(parsed/60)).padStart(2,'0')+':'+String(Math.round(parsed%60)).padStart(2,'0'):parsed;
    $('valueLabel').firstChild.textContent=clock?'Clock time (24-hour)':quantity?'Duration in minutes':'Number of rounds';
    $('sameValues').checked=false;$('valueError').textContent='';$('resetValue').hidden=old===undefined;valueDialog.showModal();
  }
  $('valueForm').onsubmit=e=>{e.preventDefault();const {row,field}=activeValue;try{const value=['reading','hearing'].includes(field)?{kind:'minutes',value:+$('correctedValue').value}:field==='rounds'?+$('correctedValue').value:$('correctedValue').value;workspace.correct(row,field,value,$('sameValues').checked);commitChanges();renderValues();valueDialog.close();toast('Value clarified in this tab. The source sheet is unchanged.');}catch(error){$('valueError').textContent=error.message;}};
  $('resetValue').onclick=()=>{delete workspace.corrections[activeValue.row][activeValue.field];commitChanges();renderValues();valueDialog.close();};
  names.addEventListener('change',e=>{const row=e.target.closest('[data-match-person]');if(row)row.querySelector('.match-state').textContent='Changed · confirm to apply';});
  names.addEventListener('click',e=>{
    const bank=e.target.closest('[data-bank-target]');if(bank){showTarget(bank.dataset.bankTarget);return;}
    const row=e.target.closest('[data-match-person]');if(!row)return;
    if(e.target.closest('[data-confirm-match]')){workspace.confirmLink(row.dataset.matchPerson,row.querySelector('select').value||null);commitChanges();renderMatches();}
    if(e.target.closest('[data-edit-target]'))showTarget(row.querySelector('select').value);
  });
  names.addEventListener('dragstart',e=>{const card=e.target.closest('[data-prescription]');if(card){draggedGroup=card.dataset.prescription;e.dataTransfer.setData('text/plain',draggedGroup);e.dataTransfer.effectAllowed='copy';}});
  names.addEventListener('dragend',()=>{draggedGroup=null;});
  names.addEventListener('dragover',e=>{if(draggedGroup&&e.target.closest('[data-match-person]'))e.preventDefault();});
  names.addEventListener('drop',e=>{const row=e.target.closest('[data-match-person]'),id=draggedGroup;if(!row||!workspace.groups.has(id))return;e.preventDefault();row.querySelector('select').value=id;row.querySelector('.match-state').textContent='Changed · confirm to apply';row.querySelector('[data-confirm-match]').focus();draggedGroup=null;});
  $('matchSearch').oninput=renderMatches;$('prescriptionSearch').oninput=renderCards;
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-open-review]');if(b)(b.dataset.openReview==='names'?showNames:showValues)();
    const v=e.target.closest('[data-value-row]');if(v)showValue(+v.dataset.valueRow,v.dataset.valueField);
  });
  $('reviewNames').onclick=showNames;$('reviewValues').onclick=showValues;
  $('importPrescriptions').onclick=()=>$('prescriptionUpload').click();
  $('prescriptionUpload').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{
    if(file.size>30*1024*1024)throw new Error('Use a prescription file smaller than 30 MB.');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false,cellNF:true,raw:/\.csv$/i.test(file.name)}),rows=S.prescriptions(S.workbook(wb,XLSX));
    loadPrescriptions(rows,{key:'file:'+file.name,title:file.name,kind:'file',loadedAt:new Date().toISOString()});toast('Personal prescriptions loaded. Review unresolved names and targets.');
  }catch(error){toast(error.message);}e.target.value='';};
  $('removePrescriptions').onclick=()=>{workspace.prescriptions=null;workspace.groups.clear();workspace.links.clear();workspace.resolved.clear();workspace.manual=Object.create(null);data={...data,prescriptions:[]};commitChanges();toast('Prescription source removed. PDF defaults apply until personal targets are confirmed.');};
  function initializeGoogle(){
    if(!/^https?:$/.test(location.protocol)){$('googleStatus').textContent='Google sign-in needs the hosted dashboard or localhost. Local file imports work here.';return;}
    if(tokenClient)return;
    if($('googleIdentityScript'))return;
    $('googleStatus').textContent='Loading Google sign-in…';
    const script=document.createElement('script');script.id='googleIdentityScript';script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onload=()=>{
      tokenClient=google.accounts.oauth2.initTokenClient({client_id:G.CLIENT_ID,scope:G.SCOPE,include_granted_scopes:false,
        error_callback:()=>{setBusy(false);$('googleStatus').textContent='The Google popup did not complete. Allow popups and click Continue with Google again.';},
        callback:response=>{if(authorizationGeneration!==generation){delete response.access_token;return;}authorizationGeneration=null;setBusy(false);if(response.error||!response.access_token){$('googleStatus').textContent='Google authorization was not completed. Check account access and tester approval, then try again.';return;}
          googleToken=response.access_token;expires=Date.now()+(Number(response.expires_in)||300)*1000-30000;delete response.access_token;$('googleDisconnect').hidden=false;readGoogle();}
      });setBusy(false);$('googleStatus').textContent='Ready. Continue with Google to read the configured sheets.';
    };
    script.onerror=()=>{script.remove();$('googleStatus').textContent='Google sign-in could not load. Reopen Data sources to retry, or use local files.';};document.head.append(script);
  }
  function openSources(){updateStatus();if(!sources.open)sources.showModal();initializeGoogle();}
  header.onclick=openSources;start.onclick=openSources;
  async function readGoogle(){
    let config;try{config=currentConfig();S.sheetId(config.responses);S.sheetId(config.prescriptions);}catch(error){$('googleStatus').textContent=error.message;return;}
    if(!googleToken||Date.now()>=expires){googleToken=null;$('googleStatus').textContent='Sign in with Google to load or refresh both sources.';return;}
    cancelRead();const requestGeneration=generation;controller=new AbortController();const activeController=controller;let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;activeController.abort();},60000);setBusy(true);$('googleStatus').textContent='Reading responses and personal prescriptions…';
    try{
      const pair=await G.readPair(config,googleToken,window.fetch.bind(window),controller.signal);if(generation!==requestGeneration)return;
      committing=true;workspace.setResponses(pair.responses.rows,pair.responses);workspace.setPrescriptions(pair.prescriptions.rows,pair.prescriptions);data={...data,source:pair.responses.title,rows:pair.responses.rows,prescriptions:pair.prescriptions.rows};googleConfig={...config};syncWorkspace();render();committing=false;
      $('googleStatus').textContent='Both sources loaded. '+counts().targetCount+' students need target review. Refresh sheets to fetch later updates.';toast('Both Google Sheets loaded.');
    }catch(error){if(generation===requestGeneration&&(timedOut||error.name!=='AbortError')){$('googleStatus').textContent=(timedOut?'The read timed out. Check your connection and try again.':error.message)+' Previously loaded data has been kept.';if(/authorization expired/i.test(error.message)){googleToken=null;expires=0;}}}
    finally{clearTimeout(timeout);committing=false;if(generation===requestGeneration){controller=null;setBusy(false);updateStatus();}}
  }
  $('googleSourcesForm').onsubmit=e=>{e.preventDefault();try{const c=currentConfig();S.sheetId(c.responses);S.sheetId(c.prescriptions);if(!tokenClient)throw new Error('Google sign-in is not ready.');if(googleToken&&Date.now()<expires)readGoogle();else{authorizationGeneration=generation;setBusy(true);$('googleStatus').textContent='Choose your Google account and approve read-only access.';tokenClient.requestAccessToken();}}catch(error){setBusy(false);$('googleStatus').textContent=error.message;}};
  refresh.onclick=()=>{if(googleConfig){$('responseSheet').value=googleConfig.responses;$('prescriptionSheet').value=googleConfig.prescriptions;$('responseTab').value=googleConfig.responseTab;$('prescriptionTab').value=googleConfig.prescriptionTab;}openSources();if(googleToken&&Date.now()<expires)readGoogle();else $('googleStatus').textContent='Your authorization has expired. Continue with Google to refresh both sheets.';};
  $('googleDisconnect').onclick=()=>{cancelRead();googleToken=null;expires=0;$('googleDisconnect').hidden=true;$('googleStatus').textContent='Google access token forgotten in this tab. Loaded data remains until Clear this tab or reload.';};
  window.addEventListener('sadhana:source-change',()=>{if(!committing)cancelRead();updateStatus();});
  window.addEventListener('sadhana:render',updateStatus);
  window.addEventListener('sadhana:clear',()=>{cancelRead();googleToken=null;expires=0;googleConfig=null;activeGroup=null;activeValue=null;$('googleDisconnect').hidden=true;$('googleSourcesForm').reset();$('googleStatus').textContent='This tab has been cleared.';for(const d of [sources,names,targetDialog,values,valueDialog])if(d.open)d.close();updateStatus();});
  updateStatus();
})();
