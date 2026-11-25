const assert=require('node:assert/strict');
const E=require('../dist/engine.js'),S=require('../dist/data-sources.js'),M=require('../dist/name-matching.js'),{Workspace}=require('../dist/source-workspace.js'),G=require('../dist/google-sheets.js');
const X=require('../dist/vendor/xlsx.full.min.js');
const headers=['Timestamp','DATE / तिथि','NAME / नाम','Today chanted round','Today total reading time','Today total hearing time','Sleeping Time',"Today's Wake-Up Time"];
const cell=(value,formatType,format)=>({value,formatType,format});
const sheet=(name,values)=>({name,rows:values.map((r,i)=>({row:i+1,cells:r.map(v=>typeof v==='object'&&v!==null?v:cell(v))}))});
const responses=sheet('Daily',[headers,['2026-10-02T08:30:00','2026-10-01','Example A',8,cell(30/1440,'TIME','[h]:mm:ss'),cell(90/1440,'TIME','[h]:mm:ss'),2100,'0500'],['2026-10-02','2026-10-01','Example B',16,'1hr','2hr','2200','0500']]);
const prescriptions=sheet('Targets',[
 ['Timestamp','Devotees Name','Prescribed Chanting Rounds','Prescribed Hearing Time (Mins)','Prescribed Reading Time (Mins)'],
 ['2026-09-01','Example A',8,cell(90/1440,'TIME','[h]:mm:ss'),30],
 ['2026-09-01','Example B Prabhu Ji',16,120,60]
]);
const rows=S.responseRows([responses]),ps=S.prescriptions([prescriptions]);
assert.equal(E.minutes(rows[0].reading),30);assert.equal(E.minutes(rows[0].hearing),90);
assert.deepEqual(ps[0].target,{rounds:8,reading:30,hearing:90});
assert.equal(S.prescriptions([sheet('Text',[[...prescriptions.rows[0].cells],['2026-09-01','Example','SIXTEEN','60','45']])])[0].target.reading,45);
assert.equal(E.minutes(S.responseRows([sheet('Plain',[headers,['2026-10-02','2026-10-01','Example',16,60,'1hr','2200','0500']])])[0].reading),null);
const shuffled=sheet('Reordered',prescriptions.rows.map(r=>[r.cells[4],r.cells[2],r.cells[1],r.cells[0],r.cells[3]]));
assert.deepEqual(S.prescriptions([shuffled])[0].target,ps[0].target);
assert.throws(()=>S.responseRows([prescriptions]),/eight/);assert.throws(()=>S.prescriptions([responses]),/Prescribed/);
assert.equal(S.serialDate(46300),'2026-10-05T00:00:00');
const id='fictional_spreadsheet_123456';assert.equal(S.sheetId('https://docs.google.com/spreadsheets/d/'+id+'/edit'),id);assert.throws(()=>S.sheetId('https://example.org/'+id));

const w=new Workspace(),names=new Map([['example a','Example A'],['example b','Example B']]);
w.setResponses(rows,{key:'r',title:'Daily'});w.setPrescriptions(ps,{key:'p',title:'Targets'});
let targets=w.targets(names);assert.deepEqual(targets['example a'],{rounds:8,reading:30,hearing:90});assert.equal(targets['example b'].rounds,null);
assert.equal(w.links.get('example a').origin,'exact');assert.equal(w.links.has('example b'),false);
assert.equal(M.suggestions('Example B',w.groups)[0].id,'example b prabhu ji');
w.confirmLink('example b','example b prabhu ji');targets=w.targets(names);assert.equal(targets['example b'].hearing,120);
const prepared=E.prepare({rows}),a=E.summarize(prepared,'2026-10-01',1,targets,'score').find(s=>s.id==='example a');assert.equal(a.average,100);
const defaults=E.summarize(prepared,'2026-10-01',1,{},'score').find(s=>s.id==='example a');assert.notEqual(a.average,defaults.average);
const duplicate=[...ps,{...ps[0],row:4,target:{rounds:16,reading:60,hearing:90}}];w.setPrescriptions(duplicate,{key:'p',title:'Targets'});targets=w.targets(names);assert.equal(targets['example a'].rounds,null);
const unknown=E.summarize(prepared,'2026-10-01',1,targets,'reading').find(s=>s.id==='example a');assert.equal(unknown.average,30);assert.equal(unknown.rate,null);assert.equal(unknown.coverage,1);
assert.equal(E.meetsTarget(unknown.history[0],unknown.target,'reading'),null);
assert.equal(E.exportRanking(prepared,'2026-10-01',1,targets,'score').find(s=>s.id==='example a').metric,null);
assert.equal(E.exportRanking(prepared,'2026-10-01',1,targets,'reporting').find(s=>s.id==='example a').metric,1);
w.confirmTarget('example a',{rounds:8,reading:30,hearing:90});assert.equal(w.targets(names)['example a'].rounds,8);
w.setPrescriptions(duplicate,{key:'p',title:'Targets'});assert.equal(w.targets(names)['example a'].rounds,8); // Same refresh retains confirmation.
w.setPrescriptions([...duplicate,{...ps[0],row:5}],{key:'p',title:'Targets'});assert.equal(w.targets(names)['example a'].rounds,null); // Changed source invalidates target confirmation.
const bad=rows.map(r=>({...r,reading:'unclear'}));w.setResponses(bad,{key:'r',title:'Daily'});w.correct(2,'reading',{kind:'minutes',value:45},true);
const corrected=E.prepare({rows:bad,valueOverrides:w.corrections});assert.equal(corrected.records[0].reading,45);assert.equal(corrected.records[1].reading,45);assert.equal(bad[0].reading,'unclear');
w.setResponses(bad.map(r=>({...r,reading:'different unclear'})),{key:'r',title:'Daily'});assert.equal(w.corrections[2].reading,undefined);
w.setResponses(bad,{key:'r',title:'Daily'});w.correct(2,'reading',{kind:'minutes',value:45});
w.setResponses(bad.map(r=>({...r,name:'Another Student'})),{key:'r',title:'Daily'});assert.equal(w.corrections[2].reading,undefined); // Row moved/replaced: do not transfer a correction to another student.
w.manual['example a']={rounds:8,reading:30,hearing:90};w.setResponses(rows,{key:'another-source',title:'Other'});assert.equal(Object.keys(w.manual).length,0);assert.equal(Object.keys(w.corrections).length,0);
assert.throws(()=>w.confirmLink('example a','does not exist'));
assert.throws(()=>w.confirmTarget('example a',{rounds:1.5,reading:30,hearing:60}));

// Cold-start proposals remain drafts until one batch confirmation, including
// choices not currently visible under a UI search/filter.
const cold=new Workspace();cold.setResponses(rows,{key:'cold-r'});cold.setPrescriptions(ps,{key:'cold-p'});cold.targets(names);
const proposals=M.proposals(names,cold.groups,cold.links);assert.equal(proposals.get('example b').group,'example b prabhu ji');assert.equal(cold.links.has('example b'),false);
const draft=cold.copy();draft.confirmLinks(proposals);assert.equal(draft.targets(names)['example b'].hearing,120);assert.equal(cold.links.has('example b'),false);
const invalid=new Map([['example a',{group:null}],['example b',{group:'missing'}]]);
assert.throws(()=>cold.confirmLinks(invalid));assert.equal(cold.links.get('example a').group,'example a');
const partial=M.groups([{...ps[0],target:{rounds:8,reading:null,hearing:90}}]).get('example a');assert.equal(partial.target,null);assert.deepEqual(partial.common,{rounds:8,reading:null,hearing:90});

// XLSX and API adapters produce the same typed quantities, independent of locale display.
const wb=X.utils.book_new(),ws=X.utils.aoa_to_sheet([headers,['2026-10-02','2026-10-01','Example A',8,30/1440,90/1440,'2100','0500']]);ws.E2.z='[h]:mm:ss';ws.F2.z='[h]:mm:ss';X.utils.book_append_sheet(wb,ws,'Daily');
const imported=X.read(X.write(wb,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellNF:true});
assert.equal(E.minutes(S.responseRows(S.workbook(imported,X))[0].reading),30);
const apiSheet=s=>({properties:{title:s.name,sheetId:1,sheetType:'GRID',gridProperties:{rowCount:s.rows.length,columnCount:s.rows[0].cells.length}},data:[{rowData:s.rows.map(r=>({values:r.cells.map(c=>({effectiveValue:typeof c.value==='number'?{numberValue:c.value}:{stringValue:c.value},effectiveFormat:{numberFormat:{type:c.formatType,pattern:c.format}}}))}))}]});

// Source-aware HHMM interpretation must agree for numeric and textual clocks,
// without restoring generic engine guesses about numbers or other field units.
const adaptedClock=c=>S.responseRows([sheet('Daily',[headers,['2026-10-02','2026-10-01','Example',16,'1hr','1hr',c,c]])])[0];
for(let v=1000;v<=2359;v++){
 const row=adaptedClock(v),expected=v%100<60?Math.floor(v/100)*60+v%100:null;
 assert.equal(E.clock(row.sleep),expected,String(v));assert.equal(E.clock(row.wake),expected,String(v));
 if(expected!==null)assert.equal(E.clock(row.sleep),E.clock(String(v)));
}
for(const v of [0,30,100,200,515,999,2400,2360,-2300,4.5,10.3,2300.5,NaN,Infinity])assert.equal(E.clock(adaptedClock(v).sleep),null,String(v));
for(const c of [cell(2300,'TIME','h:mm:ss'),cell(2300,'DATE','yyyy-mm-dd'),cell(2300,'PERCENT','0%'),cell(2300,'NUMBER','0.00'),cell(2300,undefined,'[h]:mm:ss'),cell(2300,undefined,'$0')])assert.equal(E.clock(adaptedClock(c).sleep),null,JSON.stringify(c));
for(const c of [cell(2300,'NUMBER','0'),cell(2300,undefined,'General'),cell(2300,undefined,'0000')])assert.equal(E.clock(adaptedClock(c).sleep),1380);
assert.equal(E.clock(2300),null); // Only the source adapter can establish numeric clock units.
assert.equal(E.minutes(S.responseRows([sheet('Daily',[headers,['2026-10-02','2026-10-01','Example',16,2300,2300,2300,'0500']])])[0].reading),null);

// Exercise both real workbook serialization and the Google grid adapter.
const clockBook=X.utils.book_new(),clockSheet=X.utils.aoa_to_sheet([headers,
 ['2026-10-02','2026-10-01','Example Clock',16,1/24,1/24,2300,0.20833333333575865],
 ['2026-10-03','2026-10-02','Example Clock',16,1/24,1/24,2359,(18000.001)/86400]
]);
for(const n of [2,3]){clockSheet['E'+n].z='[h]:mm:ss';clockSheet['F'+n].z='[h]:mm:ss';clockSheet['H'+n].z='hh:mm:ss.000';}
X.utils.book_append_sheet(clockBook,clockSheet,'Daily');
const clockWorkbookRows=S.responseRows(S.workbook(X.read(X.write(clockBook,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellNF:true}),X));
const clockGrid=sheet('Daily',[headers,
 ['2026-10-02','2026-10-01','Example Clock',16,'1hr','1hr',2300,cell(0.20833333333575865,'TIME','hh:mm:ss.000')],
 ['2026-10-03','2026-10-02','Example Clock',16,'1hr','1hr',2359,cell(18000.001/86400,'TIME','hh:mm:ss.000')]
]);
const clockApiRows=S.responseRows(S.snapshot({sheets:[apiSheet(clockGrid)]}));
for(const sourceRows of [clockWorkbookRows,clockApiRows]){
 const before=JSON.stringify(sourceRows),p=E.prepare({rows:sourceRows}),a=p.records[0],b=p.records[1],target={rounds:16,reading:60,hearing:60};
 assert.equal(a.sleep,1380);assert.equal(a.wake,300);assert.equal(E.scores(a,target).total,88);
 assert.ok(b.wake>300);assert.equal(E.scores(b,target).wake,15); // A real millisecond after 5am stays late.
 assert.equal(sourceRows[0].original.sleep.value,2300);assert.equal(sourceRows[0].original.wake.value,0.20833333333575865);
 assert.equal(JSON.stringify(sourceRows),before);assert.equal(p.flags.length,0);
}
assert.equal(E.clock(adaptedClock(cell(0,'TIME','hh:mm:ss')).sleep),0);
assert.equal(E.clock(adaptedClock(cell(.5,'TIME','hh:mm:ss')).sleep),720);
assert.ok(E.clock(adaptedClock(cell(86399.999/86400,'TIME','hh:mm:ss.000')).sleep)<1440);
for(const format of ['h:mm','hh:mm','h:mm am/pm','hh:mm AM/PM','h:mm a/p'])assert.equal(E.clock(adaptedClock(cell(22/24,undefined,format)).sleep),1320,format);
for(const format of ['yyyy-mm-dd h:mm','0.00','0%','"h:mm"'])assert.equal(E.clock(adaptedClock(cell(22/24,undefined,format)).sleep),null,format);
for(const type of ['DATE','DATE_TIME','PERCENT'])assert.equal(E.clock(adaptedClock(cell(22/24,type,'h:mm')).sleep),null,type);
// Actual XLSX and Google metadata can spell the same clock differently.
for(const format of ['h:mm','h:mm am/pm']){
 clockSheet.G2={t:'n',v:22/24,z:format};
 const importedClock=S.responseRows(S.workbook(X.read(X.write(clockBook,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellNF:true}),X))[0];
 assert.equal(E.clock(importedClock.sleep),1320);
 const apiClock=S.responseRows(S.snapshot({sheets:[apiSheet(sheet('Daily',[headers,['2026-10-02','2026-10-01','Example',16,'1hr','1hr',cell(22/24,'TIME',format),'0500']]))]}))[0];
 assert.equal(E.clock(apiClock.sleep),1320);
}
const rID='fictional_responses_123456789',pID='fictional_prescriptions_123456789';
(async()=>{
 const calls=[];
 const mock=async(url,options)=>{calls.push([url,options]);const response=url.includes(rID),source=response?responses:prescriptions;return {ok:true,json:async()=>({spreadsheetId:response?rID:pID,properties:{title:source.name,timeZone:'Asia/Calcutta'},sheets:[apiSheet(source)]})};};
 const pair=await G.readPair({responses:rID,prescriptions:pID},'fictional-token',mock);
 assert.equal(pair.responses.rows.length,2);assert.equal(pair.prescriptions.rows[0].target.reading,30);
 assert.equal(E.prepare({rows:pair.responses.rows}).records[0].sleep,1260);
 assert.ok(calls.every(([,o])=>o.method==='GET'&&o.headers.Authorization==='Bearer fictional-token'));
 assert.ok(calls.filter(([u])=>new URL(u).searchParams.has('ranges')).every(([u])=>!new URL(u).searchParams.get('fields').includes('userEnteredValue')));
 assert.ok(calls.some(([u])=>new URL(u).searchParams.get('ranges')==="'Targets'!A1:E"));
 await assert.rejects(G.readPair({responses:rID,prescriptions:pID},'bad',async()=>({ok:false,status:401})),/authorization expired/);
 await assert.rejects(G.readPair({responses:rID,prescriptions:pID},'bad',async()=>({ok:false,status:403})),/denied access/);
 console.log('Two-source tests passed: schemas, units, mapping, target dependencies, unresolved targets, refresh, corrections, adapter parity and read-only API.');
})().catch(e=>{console.error(e);process.exit(1);});

const missingStamp=S.responseRows([sheet('Daily',[headers,['2026-10-02','2026-10-01','Example A',16,'1hr','1hr','2100','0500'],['','2026-10-01','Example A',16,'1hr','1hr','2100','0500'],[]])]);
assert.equal(missingStamp.length,2);
const invalidated=E.prepare({rows:missingStamp});assert.equal(invalidated.days.size,0);assert.equal(invalidated.duplicates.get('example a|2026-10-01'),2);
assert.ok(invalidated.flags.some(f=>f.type==='Invalid timestamp'));
console.log('Source adapter retains missing-timestamp companions for duplicate invalidation and ignores blank rows.');
