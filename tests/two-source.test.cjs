const assert=require('node:assert/strict');
const E=require('../dist/engine.js'),S=require('../dist/data-sources.js'),M=require('../dist/name-matching.js'),{Workspace}=require('../dist/source-workspace.js'),G=require('../dist/google-sheets.js');
const X=require('../dist/vendor/xlsx.full.min.js');
const headers=['Timestamp','DATE / तिथि','NAME / नाम','Today chanted round','Today total reading time','Today total hearing time','Sleeping Time',"Today's Wake-Up Time"];
const cell=(value,formatType,format)=>({value,formatType,format});
const sheet=(name,values)=>({name,rows:values.map((r,i)=>({row:i+1,cells:r.map(v=>typeof v==='object'&&v!==null?v:cell(v))}))});
const responses=sheet('Daily',[headers,['2026-10-02T08:30:00','2026-10-01','Example A',8,cell(30/1440,'TIME','[h]:mm:ss'),cell(90/1440,'TIME','[h]:mm:ss'),'2100','0500'],['2026-10-02','2026-10-01','Example B',16,'1hr','2hr','2200','0500']]);
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
const rID='fictional_responses_123456789',pID='fictional_prescriptions_123456789';
(async()=>{
 const calls=[];
 const mock=async(url,options)=>{calls.push([url,options]);const response=url.includes(rID),source=response?responses:prescriptions;return {ok:true,json:async()=>({spreadsheetId:response?rID:pID,properties:{title:source.name,timeZone:'Asia/Calcutta'},sheets:[apiSheet(source)]})};};
 const pair=await G.readPair({responses:rID,prescriptions:pID},'fictional-token',mock);
 assert.equal(pair.responses.rows.length,2);assert.equal(pair.prescriptions.rows[0].target.reading,30);
 assert.ok(calls.every(([,o])=>o.method==='GET'&&o.headers.Authorization==='Bearer fictional-token'));
 assert.ok(calls.filter(([u])=>new URL(u).searchParams.has('ranges')).every(([u])=>!new URL(u).searchParams.get('fields').includes('userEnteredValue')));
 assert.ok(calls.some(([u])=>new URL(u).searchParams.get('ranges')==="'Targets'!A1:E"));
 await assert.rejects(G.readPair({responses:rID,prescriptions:pID},'bad',async()=>({ok:false,status:401})),/authorization expired/);
 await assert.rejects(G.readPair({responses:rID,prescriptions:pID},'bad',async()=>({ok:false,status:403})),/denied access/);
 console.log('Two-source tests passed: schemas, units, mapping, target dependencies, unresolved targets, refresh, corrections, adapter parity and read-only API.');
})().catch(e=>{console.error(e);process.exit(1);});
