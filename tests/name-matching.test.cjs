const assert=require('node:assert/strict');
const M=require('../dist/name-matching.js'),E=require('../dist/engine.js');
const groups=names=>M.groups(names.map((name,i)=>({name,row:i+2,target:{rounds:16,reading:60,hearing:60}})));
function proposal(name,candidates){const map=groups(candidates),names=new Map([[E.key(name),name]]);return M.proposals(names,map,M.reconcile(names,map)).get(E.key(name));}

assert.equal(proposal('Dr. Arvind Mehta',['Arvind Kumar Mehta']).group,'arvind kumar mehta');
assert.match(proposal('Dr. Arvind Mehta',['Arvind Kumar Mehta']).reason,/extra name part/);
assert.equal(proposal('Devendra',['Devendar Singh Sethi']).group,'devendar singh sethi');
assert.match(proposal('Devendra',['Devendar Singh Sethi']).reason,/spelling/);
assert.equal(proposal('Mehta Arvind',['Arvind Mehta']).group,'arvind mehta');
assert.equal(proposal('Arvind Mehta',['Arvind Mehta Prabhu Ji']).group,'arvind mehta prabhu ji');
assert.equal(proposal('Rina',['Rina Mataji']).group,'rina mataji');
assert.equal(proposal('A. Mehta',['Arvind Mehta']).group,'arvind mehta');
assert.equal(proposal('Jhon Sethi',['John Sethi']).group,'john sethi');
assert.equal(proposal('Árvind Mehta',['Arvind Mehta']).group,'arvind mehta');
assert.equal(proposal('Rina Mehta',['Rina Sharma']).group,null); // A shared first name is insufficient.
assert.equal(proposal('Arvind Gupta',['Arvind Kumar Mehta']).group,null);
assert.equal(proposal('Ravi Sethi',['Sanjay Sethi']).group,null); // A shared surname is insufficient.
assert.equal(proposal('Neela',['Leela Gupta']).group,null); // A similar short first name alone is weak evidence.
assert.equal(proposal('Unlisted Person',['Arvind Mehta','Rina Sharma']).origin,'unmatched');
const ambiguous=proposal('Rina',['Rina Mehta','Rina Sharma']);
assert.equal(ambiguous.origin,'ambiguous');assert.equal(ambiguous.group,null);assert.equal(ambiguous.candidates.length,2);
assert.equal(proposal('A Mehta',['Arvind Mehta','Amit Mehta']).group,null);
const middle=proposal('Arvind Kumar Mehta',['Arvind Mohan Mehta']);
assert.equal(middle.group,null);assert.ok(middle.candidates.length>0); // Offer a choice instead of silently ignoring disagreement.
assert.equal(proposal('रीना शर्मा',['रीना वर्मा']).group,null); // Retain meaningful marks and surname differences.
assert.equal(proposal('आरती मेहता',['आरती मेहता माता जी']).group,'आरती मेहता माता जी'); // Complete source parts still match with extra parts, preserving meaningful marks.

const map=groups(['Devendar Singh Sethi']),names=new Map([['devendra','Devendra']]);
const links=M.reconcile(names,map),p=M.proposals(names,map,links);
assert.equal(links.size,0);assert.equal(p.get('devendra').origin,'suggested');
assert.equal(M.targets(names,map,links).devendra.rounds,null); // A suggested spelling match is never an active target before confirmation.
assert.equal(M.reconcile(new Map([['rina','Rina']]),groups(['Rina'])).get('rina').origin,'exact');
console.log('Name matching passed: name parts, titles, spelling transpositions, initials, ambiguity, conflicting surnames, Unicode and confirmation boundaries.');
