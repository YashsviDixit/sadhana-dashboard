const {chromium,executable,appUrl}=require('./browser-setup.cjs');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:executable,headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(appUrl);
  const header='Timestamp,DATE,NAME,Today chanted round,Today total reading time,Today total hearing time,Sleeping Time,Today\'s Wake-Up Time';
  const csv=header+'\n'+Array.from({length:120},(_,i)=>'2026-10-20,2026-10-19,'+(i===0?'Example <img src=x onerror=alert(1)> & नाम':'Example '+i)+',16,01:00:00,01:00:00,2100,0500').join('\n');
  await page.locator('#upload').setInputFiles({name:'fictional.csv',mimeType:'text/csv',buffer:Buffer.from('\uFEFF'+csv)});
  await page.locator('#exportSummary').click();await page.locator('#exportStart').fill('2026-10-18');await page.locator('#exportEnd').fill('2026-10-20');
  await page.locator('#exportForm button[type="submit"]').click();const popup=page.waitForEvent('popup');await page.locator('#exportPdf').click();const report=await popup;await report.waitForLoadState();
  assert.equal(await report.locator('section tbody tr').count(),480);assert.equal(await report.locator('img,script').count(),0);assert.match(await report.locator('main').innerText(),/<img src=x onerror=alert\(1\)> & नाम/);
  assert.equal(await report.evaluate(()=>window.opener),null);
  const pdf=await report.pdf({preferCSSPageSize:true,printBackground:true});assert.ok(pdf.length>15000);assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>=8);
  await report.screenshot({path:'/private/tmp/sadhana-report-preview.png'});
  await report.close();await page.locator('[data-close="exportDialog"]').click();await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('#exportSummary').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await browser.close();console.log('PDF export passed: multipage 120-student report, Unicode/HTML escaping, isolated print tab, valid PDF bytes and visible mobile header action.');
})().catch(e=>{console.error(e);process.exit(1);});
