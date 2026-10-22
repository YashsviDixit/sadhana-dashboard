'use strict';
(function(){
  const nav=document.createElement('button');nav.className='nav';nav.dataset.view='concerns';nav.setAttribute('aria-label','Consecutive concerns');nav.innerHTML='⚑ <span>Consecutive concerns</span>';document.querySelector('.nav[data-view="quality"]').before(nav);
  const controls=document.createElement('div');controls.id='concernControls';controls.className='concern-controls';
  controls.innerHTML='<label>At least <input id="concernDays" type="number" min="1" max="366" value="3" aria-label="Minimum consecutive concern days"> consecutive concern days</label><select id="concernScope" aria-label="Concern streak timing"><option value="any">Anywhere in selected period</option><option value="ongoing">Still ongoing at period end</option></select><p id="concernExplanation"></p>';
  document.querySelector('.toolbar').after(controls);
  for(const id of ['concernDays','concernScope'])$(id).addEventListener('change',()=>{if(!$(id).checkValidity())return;render();});
  const button=document.createElement('button');button.id='exportSummary';button.className='import-button secondary';button.textContent='Export report';$('importResponses').after(button);
  let printReport='';
  const dialog=document.createElement('dialog');dialog.id='exportDialog';dialog.setAttribute('aria-labelledby','exportTitle');
  dialog.innerHTML='<div class="dialog-top"><h2 id="exportTitle">Export report</h2><button class="close-button" data-close="exportDialog" aria-label="Close export">×</button></div><div class="method-content"><p>All listed students, lowest first in each ranking. Dashboard search and filters do not limit this report.</p><form id="exportForm"><div class="export-dates"><label>Start date<input id="exportStart" type="date" required></label><label>End date<input id="exportEnd" type="date" required></label></div><fieldset><legend>Rankings to include</legend>'+Object.entries({score:'Overall score',reporting:'Reporting consistency',rounds:'Chanting regularity',reading:'Reading regularity',hearing:'Hearing regularity',wake:'Waking regularity',sleep:'Sleeping regularity',readingAmount:'Reading minutes',hearingAmount:'Hearing minutes',roundsAmount:'Chanting rounds'}).map(([key,label])=>'<label><input type="checkbox" name="ranking" value="'+key+'" '+(['score','reporting','rounds','reading'].includes(key)?'checked':'')+'> '+label+'</label>').join('')+'</fieldset><button class="import-button" type="submit">Preview report</button></form><p id="exportError" role="alert"></p><div id="exportResult" hidden><label for="exportText">Preview · you can select and copy this text</label><textarea id="exportText" readonly rows="16"></textarea><div class="setup-actions"><button id="copySummary" class="import-button">Copy for WhatsApp</button><button id="downloadSummary" class="text-button">Download text</button></div></div></div>';
  document.body.append(dialog);
  button.onclick=()=>{$('exportStart').value=$('startDate').value;$('exportEnd').value=$('endDate').value;$('exportResult').hidden=true;$('exportError').textContent='';dialog.showModal();};
  $('exportForm').addEventListener('input',()=>{$('exportResult').hidden=true;$('exportError').textContent='';});
  $('exportForm').onsubmit=event=>{
    event.preventDefault();const start=$('exportStart').value,end=$('exportEnd').value,selected=Array.from(dialog.querySelectorAll('[name="ranking"]:checked'),el=>el.value);
    const error=!E.date(start)||!E.date(end)||start>end?'Choose a valid start and end date.':!selected.length?'Choose at least one ranking.':!prepared.names.size?'Import responses or a student list first.':'';
    $('exportError').textContent=error;if(error){$('exportResult').hidden=true;return;}
    const length=E.distance(end,start)+1;
    const lines=['SADHANA SUMMARY',fmtDate(start)+' – '+fmtDate(end)+' · '+length+' days','Lowest first; no usable data listed separately.','Practice regularity = target met / readable reported days. Missing reports are not zero practice.','Default targets: 16 rounds, 60 min reading/hearing; personal targets used where confirmed. Waking by 05:00; sleeping from noon to before 22:00.',''];
    const sections=[];
    for(const key of selected){
      const amount=key.endsWith('Amount'),a=amount?key.slice(0,-6):key;
      const label=dialog.querySelector('[value="'+key+'"]').parentElement.textContent.trim();
      const rows=E.summarize(prepared,end,length,targets,a).map(s=>({...s,metric:a==='reporting'?s.coverage:a==='score'||amount?s.average:s.rate}));
      rows.sort((a,b)=>(a.metric===null)-(b.metric===null)||(a.metric??0)-(b.metric??0)||a.coverage-b.coverage||a.name.localeCompare(b.name));
      lines.push(label.toUpperCase()+(a==='score'?' · mean of scorable days':amount?' · mean of readable days':''));
      let rank=0;const tableRows=[];
      for(const s of rows){const prefix=s.metric===null?'—':String(++rank);const metric=s.metric===null?'No usable data':a==='reporting'?percent(s.coverage):a==='score'?quantity(s.average,a)+' ('+s.known+' scorable days)':amount?quantity(s.average,a):percent(s.rate)+' ('+s.meets+'/'+s.known+' known days)';const target=a==='rounds'||a==='reading'||a==='hearing'?s.target[a]+(a==='rounds'?' rounds':' min'):'—';lines.push(prefix+'. '+s.name+' — '+metric+' · reported '+s.observed+'/'+length+(target!=='—'?' · target '+target:''));tableRows.push('<tr><td>'+prefix+'</td><td>'+esc(s.name)+'</td><td>'+esc(metric)+'</td><td>'+s.observed+'/'+length+'</td><td>'+target+'</td></tr>');}
      sections.push('<section><h2>'+esc(label)+'</h2><p>'+(a==='score'?'Average score across fully scorable days.':amount?'Average quantity across readable reported days.':a==='reporting'?'Percentage of selected practice dates with usable reports.':'Percentage of readable reported days meeting the target.')+' Lowest first; unavailable values are unranked.</p><table><thead><tr><th>#</th><th>Student</th><th>Result</th><th>Reported days</th><th>Target</th></tr></thead><tbody>'+tableRows.join('')+'</tbody></table></section>');
      lines.push('');
    }
    printReport=window.SadhanaReportDocument({start,end,length,sections});
    $('exportText').value=lines.join('\n');$('exportResult').hidden=false;
  };
  $('copySummary').onclick=async()=>{try{await navigator.clipboard.writeText($('exportText').value);toast('Summary copied. Paste it into WhatsApp.');}catch(_){$('exportText').focus();$('exportText').select();toast('Select and copy the preview text to share it.');}};
  $('downloadSummary').onclick=()=>{const url=URL.createObjectURL(new Blob([$('exportText').value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='sadhana-summary-'+$('exportStart').value+'-to-'+$('exportEnd').value+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const pdfButton=document.createElement('button');pdfButton.id='exportPdf';pdfButton.className='import-button';pdfButton.textContent='PDF / Print report';$('copySummary').before(pdfButton);
  const exportActions=$('copySummary').parentElement;$('exportResult').prepend(exportActions);
  const pdfHint=document.createElement('p');pdfHint.textContent='PDF opens a formatted report in a new tab. Choose Print / Save as PDF there, then select Save as PDF in your browser’s print window.';exportActions.after(pdfHint);
  pdfButton.onclick=()=>{const report=window.open('','_blank');if(!report){toast('Allow pop-ups for this site to open the PDF report.');return;}report.opener=null;report.document.open();report.document.write(printReport);report.document.close();report.document.getElementById('printReport').onclick=()=>report.print();};
  render();
})();
