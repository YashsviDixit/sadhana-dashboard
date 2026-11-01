// Feed fictional fixtures through the same two-file setup used by mentors.
const fs=require('node:fs'),X=require('../dist/vendor/xlsx.full.min.js');
module.exports=async function loadFiles(page,responseFile,prescriptionFile){
  if(!prescriptionFile){
    const bytes=typeof responseFile==='string'?fs.readFileSync(responseFile):responseFile.buffer;
    const book=X.read(bytes,{type:'buffer'});let names=[];
    for(const name of book.SheetNames){const rows=X.utils.sheet_to_json(book.Sheets[name],{header:1,defval:''}),h=rows.findIndex(r=>r.some(v=>/timestamp/i.test(String(v))));if(h<0)continue;const col=rows[h].findIndex(v=>/name|नाम/i.test(String(v)));if(col>=0){names=[...new Set(rows.slice(h+1).map(r=>String(r[col]||'').trim()).filter(Boolean))];break;}}
    const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
    prescriptionFile={name:'fictional-targets.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFFFull Name,Prescribed Chanting Rounds,Prescribed Hearing Time (Mins),Prescribed Reading Time (Mins)\n'+names.map(n=>[n,16,60,60].map(q).join(',')).join('\n'))};
  }
  await page.locator('#importResponses').click();await page.locator('#chooseLocal').click();
  await page.locator('#upload').setInputFiles(responseFile);await page.locator('#prescriptionUpload').setInputFiles(prescriptionFile);
  await page.locator('#localSourcesForm button[type=submit]').click();await page.locator('#confirmMatches').click();await page.locator('#targetReviewForm button[type=submit]').click();
  await page.locator('#sourcesDialog').waitFor({state:'hidden'});
};
