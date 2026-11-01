const assert=require('node:assert/strict');
const E=require('../dist/engine.js');

// Snapshot spellings can be corrected only within their own field type.
assert.deepEqual(E.interpret('reading','  45   MINTS '),{raw:'  45   MINTS ',value:45,status:'dictionary'});
assert.equal(E.interpret('hearing','One and half hours ').value,90);
assert.equal(E.interpret('reading','120 minutes. ').value,120);
assert.equal(E.interpret('hearing','1hrs. 35min').value,95);
assert.equal(E.interpret('rounds','SIXTEEN ').value,16);
assert.equal(E.interpret('rounds','16,').value,16);
assert.equal(E.interpret('wake','4:30 a.m ').value,270);
assert.equal(E.interpret('sleep','10.30.pm').value,1350);
assert.equal(E.interpret('wake','3:45 p.m').value,945); // Do not change an unlikely PM to AM.
assert.equal(E.interpret('sleep','7 hrs').value,null); // Sleep length is not a bedtime.
assert.equal(E.interpret('rounds','45 mints').value,null);
assert.equal(E.interpret('reading','10.30.pm').value,null);
for(const input of ['30min to 1hrs','Around 60 mins','Atleast 120 mins','More then 60 minutes 120 minutes.','60 minutes 60','3 hrs average','2hr¹10']){
  assert.equal(E.interpret('reading',input).status,'needs-confirmation',input);
}
for(const input of ['Not slept','Didnt sleep','Rateijaagran..','O200','20.30pm'])assert.equal(E.interpret('sleep',input).value,null,input);
assert.equal(E.interpret('reading',60).value,null); // Source adapter must establish numeric units.
assert.equal(E.interpret('reading',{kind:'minutes',value:60}).value,60);
assert.equal(E.interpret('reading','0').value,0);
assert.equal(E.interpret('reading','').value,null);
assert.equal(E.interpret('reading','1hr').status,'parsed');
assert.deepEqual(E.interpret('reading','2.75 minutes'),{raw:'2.75 minutes',value:2.75,status:'parsed'});
assert.throws(()=>E.interpret('name','Example'),/Unknown practice field/);
assert.ok(Object.isFrozen(E.valueDictionary)&&Object.isFrozen(E.valueDictionary.minutes));
assert.equal(E.key('constructor'),'constructor');

// Verify the dictionary changes actual engine inputs and scoring, while the
// original row remains available for review and explicit unknowns stay flagged.
const row={row:2,name:'Fictional Student',date:'2026-10-01',timestamp:'2026-10-02',rounds:'SIXTEEN',reading:'45 mints',hearing:'One and half hours',sleep:'10.30.pm',wake:'4:30 a.m'};
const before=JSON.stringify(row),p=E.prepare({rows:[row]});
assert.equal(JSON.stringify(row),before);
assert.equal(p.flags.length,0);
const s=E.summarize(p,'2026-10-01',1,{},'score')[0];
assert.equal(s.history[0].scores.total,90);
assert.equal(s.history[0].reading,45);
const unclear=E.prepare({rows:[{...row,reading:'30min to 1hrs'}]});
assert.equal(unclear.flags.filter(f=>f.type==='Check reading').length,1);
assert.equal(unclear.records[0].reading,null);
assert.equal(unclear.flags[0].raw.reading,'30min to 1hrs');
console.log('Value dictionary: typed conversions, ambiguity, provenance, field isolation and scoring integration passed.');
