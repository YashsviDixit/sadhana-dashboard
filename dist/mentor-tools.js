'use strict';
(function(){
  const controls=document.createElement('div');controls.id='concernControls';controls.className='concern-controls';
  controls.innerHTML='<label><input id="concernsOnly" type="checkbox"> At least <input id="concernDays" type="number" min="1" max="366" value="3" aria-label="Minimum consecutive concern days"> consecutive concern days</label><select id="concernScope" aria-label="Concern streak timing"><option value="any">Anywhere in selected period</option><option value="ongoing">Still ongoing at period end</option></select><p id="concernExplanation"></p>';
  document.querySelector('.toolbar').after(controls);
  for(const id of ['concernsOnly','concernDays','concernScope'])$(id).addEventListener('change',()=>{if(!$(id).checkValidity())return;render();});
  const button=document.createElement('button');button.id='exportSummary';button.className='text-button';button.textContent='Export summary';$('settingsButton').before(button);
  const dialog=document.createElement('dialog');dialog.id='exportDialog';dialog.setAttribute('aria-labelledby','exportTitle');
  dialog.innerHTML='<div class="dialog-top"><h2 id="exportTitle">Export summary</h2><button class="close-button" data-close="exportDialog" aria-label="Close export">×</button></div><div class="method-content"><p>All listed students, lowest first in each ranking. Dashboard search and filters do not limit this report.</p><form id="exportForm"><div class="export-dates"><label>Start date<input id="exportStart" type="date" required></label><label>End date<input id="exportEnd" type="date" required></label></div><fieldset><legend>Rankings to include</legend>'+Object.entries({score:'Overall score',reporting:'Reporting consistency',rounds:'Chanting regularity',reading:'Reading regularity',hearing:'Hearing regularity',wake:'Waking regularity',sleep:'Sleeping regularity',readingAmount:'Reading minutes',hearingAmount:'Hearing minutes',roundsAmount:'Chanting rounds'}).map(([key,label])=>'<label><input type="checkbox" name="ranking" value="'+key+'" '+(['score','reporting','rounds','reading'].includes(key)?'checked':'')+'> '+label+'</label>').join('')+'</fieldset><button class="import-button" type="submit">Preview report</button></form><p id="exportError" role="alert"></p><div id="exportResult" hidden><label for="exportText">Preview · you can select and copy this text</label><textarea id="exportText" readonly rows="16"></textarea><div class="setup-actions"><button id="copySummary" class="import-button">Copy for WhatsApp</button><button id="downloadSummary" class="text-button">Download text</button></div></div></div>';
  document.body.append(dialog);
  button.onclick=()=>{$('exportStart').value=$('startDate').value;$('exportEnd').value=$('endDate').value;$('exportResult').hidden=true;$('exportError').textContent='';dialog.showModal();};
  $('exportForm').addEventListener('input',()=>{$('exportResult').hidden=true;$('exportError').textContent='';});
  $('exportForm').onsubmit=event=>{
    event.preventDefault();const start=$('exportStart').value,end=$('exportEnd').value,selected=Array.from(dialog.querySelectorAll('[name="ranking"]:checked'),el=>el.value);
    const error=!E.date(start)||!E.date(end)||start>end?'Choose a valid start and end date.':!selected.length?'Choose at least one ranking.':!prepared.names.size?'Import responses or a student list first.':'';
    $('exportError').textContent=error;if(error){$('exportResult').hidden=true;return;}
    const length=E.distance(end,start)+1;
    const lines=['SADHANA SUMMARY',fmtDate(start)+' – '+fmtDate(end)+' · '+length+' days','Lowest first; no usable data listed separately.','Practice regularity = target met / readable reported days. Missing reports are not zero practice.','Default targets: 16 rounds, 60 min reading/hearing; personal targets used where confirmed. Waking by 05:00; sleeping from noon to before 22:00.',''];
    for(const key of selected){
      const amount=key.endsWith('Amount'),a=amount?key.slice(0,-6):key;
      const label=dialog.querySelector('[value="'+key+'"]').parentElement.textContent.trim();
      const rows=E.summarize(prepared,end,length,targets,a).map(s=>({...s,metric:a==='reporting'?s.coverage:a==='score'||amount?s.average:s.rate}));
      rows.sort((a,b)=>(a.metric===null)-(b.metric===null)||(a.metric??0)-(b.metric??0)||a.coverage-b.coverage||a.name.localeCompare(b.name));
      lines.push(label.toUpperCase()+(a==='score'?' · mean of scorable days':amount?' · mean of readable days':''));
      let rank=0;
      for(const s of rows){const prefix=s.metric===null?'—':String(++rank);const metric=s.metric===null?'No usable data':a==='reporting'?percent(s.coverage):a==='score'?quantity(s.average,a)+' ('+s.known+' scorable days)':amount?quantity(s.average,a):percent(s.rate)+' ('+s.meets+'/'+s.known+' known days)';lines.push(prefix+'. '+s.name+' — '+metric+' · reported '+s.observed+'/'+length+(a==='rounds'||a==='reading'||a==='hearing'?' · target '+s.target[a]+(a==='rounds'?' rounds':' min'):''));}
      lines.push('');
    }
    $('exportText').value=lines.join('\n');$('exportResult').hidden=false;
  };
  $('copySummary').onclick=async()=>{try{await navigator.clipboard.writeText($('exportText').value);toast('Summary copied. Paste it into WhatsApp.');}catch(_){$('exportText').focus();$('exportText').select();toast('Select and copy the preview text to share it.');}};
  $('downloadSummary').onclick=()=>{const url=URL.createObjectURL(new Blob([$('exportText').value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='sadhana-summary-'+$('exportStart').value+'-to-'+$('exportEnd').value+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  render();
})();
