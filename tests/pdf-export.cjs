const loadFiles=require('./load-files.cjs');
const {chromium,executable,appUrl}=require('./browser-setup.cjs');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:executable,headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(appUrl);
  const header='Timestamp,DATE,NAME,Today chanted round,Today total reading time,Today total hearing time,Sleeping Time,Today\'s Wake-Up Time';
  const csv=header+'\n'+Array.from({length:120},(_,i)=>'2026-10-20,2026-10-19,'+(i===0?'Example <img src=x onerror=alert(1)> & नाम':'Example '+i)+',16,01:00:00,01:00:00,2100,0500').join('\n');
  await loadFiles(page,{name:'fictional.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFF'+csv)});
  await page.locator('#exportSummary').click();await page.locator('#exportStart').fill('2026-10-18');await page.locator('#exportEnd').fill('2026-10-20');
  // Exercise report presentation at exact score boundaries, independent of
  // discrete methodology marks (the engine's real calculations have unit tests).
  await page.evaluate(()=>{const original=E.exportRanking;E.exportRanking=(...args)=>{const rows=original(...args);if(args[4]==='score'){const metrics=[0,39.99,40,59.99,60,79.99,80,100,null];rows.forEach((r,i)=>{if(i<metrics.length)r.metric=metrics[i];});rows.sort((a,b)=>(a.metric===null)-(b.metric===null)||(a.metric??0)-(b.metric??0));}return rows;};});
  await page.locator('#exportForm button[type="submit"]').click();const popup=page.waitForEvent('popup');await page.locator('#exportPdf').click();const report=await popup;await report.waitForLoadState();
  assert.equal(await report.locator('section tbody tr').count(),480);assert.equal(await report.locator('img,script').count(),0);assert.match(await report.locator('main').innerText(),/<img src=x onerror=alert\(1\)> & नाम/);
  const overall=report.locator('section').first();
  assert.deepEqual(await overall.locator('.group-heading h3').allTextContents(),['On their own','Prabhupada Bhrose','Need mercy','Good sadhaka','Awaiting targets']);
  for(const [key,count] of [['own',113],['bhrose',2],['mercy',2],['good',2],['unranked',1]])assert.equal(await overall.locator('.score-'+key+' tbody tr').count(),count);
  assert.equal(await overall.locator('tbody .score-label, tbody tr[class^="score-"]').count(),0);
  assert.equal(await report.locator('section:not(:first-of-type) .score-group').count(),0);
  assert.match(await overall.locator('.score-mercy tbody').innerText(),/79\.99\/100/);
  assert.match(await overall.locator('.score-unranked tbody').innerText(),/Target unavailable/);
  assert.equal(await overall.locator('.score-legend').count(),0);
  assert.equal(await overall.locator('tbody tr').evaluateAll(rows=>new Set(rows.map(r=>r.cells[1].textContent)).size),120);
  assert.deepEqual(await overall.locator('tbody tr td:first-child').allTextContents(),[...Array.from({length:119},(_,i)=>String(i+1)),'—']);
  await report.emulateMedia({media:'print'});
  assert.equal(await overall.locator('.group-heading').first().evaluate(el=>getComputedStyle(el).printColorAdjust),'exact');
  assert.equal(await overall.locator('.group-heading').first().evaluate(el=>getComputedStyle(el).breakAfter),'avoid');
  const backgrounds=await overall.locator('.group-heading').evaluateAll(headings=>headings.slice(0,4).map(el=>getComputedStyle(el).backgroundColor));
  assert.equal(new Set(backgrounds).size,4);assert.ok(backgrounds.every(c=>c!=='rgba(0, 0, 0, 0)'));
  await report.emulateMedia({media:'screen'});
  assert.equal(await report.evaluate(()=>window.opener),null);
  const pdf=await report.pdf({preferCSSPageSize:true,printBackground:true});assert.ok(pdf.length>15000);assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>=8);
  require('node:fs').writeFileSync('/private/tmp/sadhana-grouped-large.pdf',pdf);
  await report.screenshot({path:'/private/tmp/sadhana-report-preview.png'});
  await report.close();
  // Compact preview for visual inspection of all categories; then an all-unranked
  // report proves empty score categories are omitted without dropping students.
  await page.evaluate(()=>{const previous=E.exportRanking;E.exportRanking=(...args)=>args[4]==='score'?previous(...args).filter(r=>[0,39.99,40,59.99,60,79.99,80,100,null].includes(r.metric)):previous(...args).slice(0,9);});
  await page.locator('#exportForm button[type="submit"]').click();
  const compactPromise=page.waitForEvent('popup');await page.locator('#exportPdf').click();const compact=await compactPromise;await compact.waitForLoadState();
  await compact.pdf({path:'/private/tmp/sadhana-grouped-compact.pdf',preferCSSPageSize:true,printBackground:true});
  await compact.screenshot({path:'/private/tmp/sadhana-report-groups.png',fullPage:true});
  await compact.setViewportSize({width:390,height:844});assert.equal(await compact.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await compact.close();
  await page.evaluate(()=>{const original=E.exportRanking;E.exportRanking=(...args)=>original(...args).map(r=>({...r,metric:null}));});
  await page.locator('#exportForm button[type="submit"]').click();const unknownPromise=page.waitForEvent('popup');await page.locator('#exportPdf').click();const unknown=await unknownPromise;await unknown.waitForLoadState();
  assert.deepEqual(await unknown.locator('section').first().locator('.group-heading h3').allTextContents(),['Awaiting targets']);
  assert.equal(await unknown.locator('section').first().locator('tbody tr').count(),9);await unknown.close();
  await page.locator('[data-close="exportDialog"]').click();await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#exportSummary').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await browser.close();console.log('PDF export passed: multipage 120-student report, Unicode/HTML escaping, isolated print tab, valid PDF bytes and visible mobile header action.');
})().catch(e=>{console.error(e);process.exit(1);});
