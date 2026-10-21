const {chromium,executable,appUrl}=require('./browser-setup.cjs');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:executable,headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(appUrl);
  await page.locator('#importResponses').focus();
  const picker=page.waitForEvent('filechooser');await page.keyboard.press('Enter');assert.equal((await picker).isMultiple(),false);
  for(const view of ['overview','reporting','quality'])assert.ok(await page.locator('.nav[data-view="'+view+'"]').getAttribute('aria-label'));
  assert.equal(await page.locator('#studentDialog').getAttribute('aria-labelledby'),'studentName');
  const csv='Timestamp,DATE,NAME,Today chanted round,Today total reading time,Today total hearing time,Sleeping Time,Today\'s Wake-Up Time\n'+Array.from({length:50},(_,i)=>'2026-10-20,2026-10-19,Example '+String(i).padStart(2,'0')+',16,01:00:00,01:00:00,2100,0500').join('\n');
  await page.locator('#upload').setInputFiles({name:'fictional.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.locator('[data-range-days="56"]').click();
  async function checkFrozen(){
    await page.locator('#content').scrollIntoViewIfNeeded();
    const positions=await page.evaluate(()=>{const c=document.getElementById('content');c.scrollTop=400;c.scrollLeft=300;const corner=c.querySelector('thead th'),name=c.querySelector('tbody tr:nth-child(20) td');const box=c.getBoundingClientRect();return {scrolled:c.scrollTop>0&&c.scrollLeft>0,left:Math.abs(corner.getBoundingClientRect().left-box.left),top:Math.abs(corner.getBoundingClientRect().top-box.top),nameLeft:Math.abs(name.getBoundingClientRect().left-box.left)};});
    assert.equal(positions.scrolled,true);assert.ok(positions.left<3&&positions.top<3&&positions.nameLeft<3,JSON.stringify(positions));
  }
  await checkFrozen();
  await page.locator('#tableButton').click();
  await page.setViewportSize({width:800,height:900});await checkFrozen();
  await page.locator('#content').evaluate(el=>{el.scrollTop=0;el.scrollLeft=0;});
  await page.locator('.name-button').first().click();
  await page.locator('#studentDialog .dialog-top').click();assert.equal(await page.locator('#studentDialog').isVisible(),true);
  const header=await page.locator('#studentDialog .dialog-top').boundingBox();
  await page.mouse.move(header.x+10,header.y+10);await page.mouse.down();await page.mouse.move(5,5);await page.mouse.up();assert.equal(await page.locator('#studentDialog').isVisible(),true);
  await page.locator('#studentDialog').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const close=await page.locator('[data-close="studentDialog"]').boundingBox(),dialog=await page.locator('#studentDialog').boundingBox();assert.ok(close.y>=dialog.y&&close.y+close.height<=dialog.y+dialog.height);
  await page.locator('[data-close="studentDialog"]').click();assert.equal(await page.locator('#studentDialog').isVisible(),false);
  await page.locator('.name-button').first().click();await page.mouse.click(5,5);assert.equal(await page.locator('#studentDialog').isVisible(),false);
  await page.locator('.name-button').first().click();await page.keyboard.press('Escape');assert.equal(await page.locator('#studentDialog').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('name-button')),true);
  await page.setViewportSize({width:390,height:844});await page.locator('.name-button').first().click();
  await page.locator('#studentDialog').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const stickyHistory=await page.locator('.history-scroll').evaluate(el=>{el.scrollTop=300;el.scrollLeft=200;const box=el.getBoundingClientRect(),th=el.querySelector('th').getBoundingClientRect();return Math.abs(th.left-box.left)<3&&Math.abs(th.top-box.top)<3;});assert.equal(stickyHistory,true);
  await page.locator('[data-close="studentDialog"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#settingsButton').click();await page.mouse.click(5,5);assert.equal(await page.locator('#settingsDialog').isVisible(),false);
  assert.deepEqual(errors,[]);await browser.close();console.log('UI polish passed: frozen table headers/columns, sticky dialog close, backdrop click, drag safety, Escape/focus restoration and mobile history scrolling.');
})().catch(e=>{console.error(e);process.exit(1);});
