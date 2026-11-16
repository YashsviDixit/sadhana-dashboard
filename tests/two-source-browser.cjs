const {chromium,executable}=require('./browser-setup.cjs');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const rID='fictional_responses_123456789',pID='fictional_prescriptions_123456789';
const rHeader=['Timestamp','DATE','NAME','Today chanted round','Today total reading time','Today total hearing time','Sleeping Time',"Today's Wake-Up Time"];
const pHeader=['Timestamp','Devotees Name','Prescribed Chanting Rounds','Prescribed Hearing Time (Mins)','Prescribed Reading Time (Mins)'];
const cell=(v,format)=>({effectiveValue:typeof v==='number'?{numberValue:v}:{stringValue:v},...(format?{effectiveFormat:{numberFormat:{type:'TIME',pattern:format}}}:{})});
const duration=n=>cell(n/1440,'[h]:mm:ss');
const snapshot=(id,title,rows)=>({spreadsheetId:id,properties:{title,timeZone:'Asia/Calcutta',locale:'en_US'},sheets:[{properties:{title:'Responses',sheetId:1,sheetType:'GRID',gridProperties:{rowCount:rows.length,columnCount:rows[0].length}},data:[{rowData:rows.map(row=>({values:row.map(v=>typeof v==='object'?v:cell(v))}))}]}]});
let targetA=8,readingA=30,failPrescription=false;
const daily=()=>snapshot(rID,'Fictional daily sheet',[
 rHeader,[46297+8/24,46296,'Example A',8,duration(30),duration(90),'2100','0500'],
 [46297+8/24,46296,'Example B',16,duration(60),duration(120),'2100','0500'],
 [46297+8/24,46296,'Example C',8,'unclear duration',duration(60),'2100','unclear clock']
]);
const prescribed=()=>snapshot(pID,'Fictional target sheet',[
 pHeader,[46200,'Example A',targetA,duration(90),typeof readingA==='number'?duration(readingA):readingA],
 [46200,'Example B Prabhu Ji',16,duration(120),'One and half hours'],
 [46200,'Example C',8,duration(60),'Between half and one hour'],
 [46201,'Example C',16,duration(120),duration(60)]
]);
(async()=>{
 const root=path.resolve(__dirname,'../dist');
 const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,body)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:executable,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:"window.google=window.google||{};window.google.accounts={oauth2:{initTokenClient:config=>{window.testGoogleScope=config.scope;window.testGoogleUnion=config.include_granted_scopes;return {requestAccessToken:()=>config.callback({access_token:'fictional-browser-token',expires_in:3600,scope:window.testGrantedScope||config.scope})};}}};"}));
  await page.route('https://apis.google.com/js/api.js',route=>route.fulfill({contentType:'application/javascript',body:`
    window.gapi={load:(name,options)=>{window.google=window.google||{};google.picker={
      ViewId:{SPREADSHEETS:'spreadsheets'},Action:{PICKED:'picked',CANCEL:'cancel'},
      DocsView:class{constructor(id){window.testView=id;}setMimeTypes(type){window.testMime=type;return this;}},
      PickerBuilder:class{
        setAppId(v){window.testAppId=v;return this;}setDeveloperKey(v){return this;}
        setOAuthToken(v){window.testPickerToken=v;return this;}setOrigin(v){window.testPickerOrigin=v;return this;}
        setTitle(v){window.testPickerTitle=v;return this;}addView(v){return this;}setCallback(fn){this.callback=fn;return this;}
        build(){const callback=this.callback;return {setVisible:visible=>{window.testPickerVisible=visible;},dispose:()=>{},callback};}
      }
    };const build=google.picker.PickerBuilder.prototype.build;google.picker.PickerBuilder.prototype.build=function(){const picker=build.call(this);window.testPicker=picker;return picker;};options.callback();}};
  `}));
  const pick=async(role,id)=>{
    await page.locator(role==='responses'?'#pickResponses':'#pickPrescriptions').click();
    await page.waitForFunction(()=>window.testPickerVisible===true);
    await page.evaluate(id=>testPicker.callback({action:'picked',docs:[{id,name:id.includes('responses')?'Fictional daily sheet':'Fictional target sheet',mimeType:'application/vnd.google-apps.spreadsheet'}]}),id);
    await page.locator('#sourcesDialog').waitFor({state:'visible'});
  };
  await page.route('https://sheets.googleapis.com/**',async route=>{
   const req=route.request();calls.push({url:req.url(),method:req.method(),auth:req.headers().authorization});
   if(failPrescription&&req.url().includes(pID))return route.fulfill({status:403,contentType:'application/json',body:'{}'});
   return route.fulfill({contentType:'application/json',body:JSON.stringify(req.url().includes(rID)?daily():prescribed())});
  });
  await page.clock.install({time:new Date('2026-11-01T12:00:00Z')});
  await page.goto('http://127.0.0.1:'+server.address().port);
  assert.equal(await page.locator('#responseSheet, #prescriptionSheet').count(),0);
  assert.equal(await page.locator('#dataSources').isVisible(),false);
  await page.locator('#importResponses').click();await page.locator('#chooseLocal').click();
  const pcsv=pHeader.join(',')+'\n2026-09-01,Example A,8,90,30\n',rcsv=rHeader.join(',')+'\n2026-10-02,2026-10-01,Example A,8,00:30:00,01:30:00,2100,0500\n';
  await page.locator('#upload').setInputFiles({name:'fictional-responses.csv',mimeType:'text/csv',buffer:Buffer.from(rcsv)});
  await page.locator('#localSourcesForm button[type=submit]').click();assert.equal(await page.locator('#nameStage').isVisible(),false);assert.equal(await page.evaluate(()=>data.rows.length),0);assert.equal(calls.length,0);
  await page.locator('[data-close="sourcesDialog"]').click();
  await page.locator('#startGoogle').click();await page.locator('#googleConnect').click();
  assert.equal(await page.evaluate(()=>window.testGoogleScope),'https://www.googleapis.com/auth/drive.file');assert.equal(await page.evaluate(()=>window.testGoogleUnion),false);assert.equal(calls.length,0);
  await pick('responses',rID);await pick('prescriptions',rID);assert.match(await page.locator('#googleStatus').innerText(),/two different/);assert.equal(await page.locator('#prescriptionSheetName').innerText(),'No sheet selected');
  await page.locator('#pickPrescriptions').click();await page.waitForFunction(()=>window.testPickerVisible===true);await page.evaluate(()=>testPicker.callback({action:'cancel'}));await page.locator('#sourcesDialog').waitFor({state:'visible'});assert.match(await page.locator('#googleStatus').innerText(),/cancelled/);
  await pick('prescriptions',pID);assert.equal(calls.length,0);assert.equal(await page.evaluate(()=>window.testAppId),'922908907926');assert.equal(await page.evaluate(()=>window.testMime),'application/vnd.google-apps.spreadsheet');
  await page.locator('#googleConnect').click();await page.locator('#targetStage').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>data.rows.length),0);
  assert.equal(await page.locator('.identity-question').count(),1);assert.equal(await page.locator('.target-review-row').count(),1);assert.equal(await page.locator('#confirmMatches').count(),0);
  await page.locator('[data-close="sourcesDialog"]').click();assert.equal(await page.evaluate(()=>workspace.prescriptions),null);
  await page.locator('#startGoogle').click();await page.locator('#googleConnect').click();await page.locator('#targetStage').waitFor({state:'visible'});
  const issue=page.locator('[data-review-person="example b"]');assert.match(await issue.innerText(),/Example B Prabhu Ji/);assert.match(await issue.innerText(),/titles and punctuation/);
  assert.match(await page.locator('#reviewSummary').innerText(),/1 name from the response sheet to the prescribed targets sheet/);assert.match(await page.locator('#reviewSummary').innerText(),/Selected matches will be used when you click Open dashboard/);assert.match(await issue.innerText(),/Name in response sheet/);assert.match(await issue.innerText(),/Selected name in prescribed targets sheet/);assert.equal(await issue.locator('[data-change-person]').innerText(),'Choose a different match');assert.equal(await issue.locator('[data-unmatch-person]').innerText(),'Remove this match');
  await page.screenshot({path:'/private/tmp/sadhana-simple-review-desktop.png'});await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#sourcesDialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);await page.screenshot({path:'/private/tmp/sadhana-simple-review-mobile.png'});await page.setViewportSize({width:1360,height:1000});
  await issue.locator('[data-change-person]').click();const b=page.locator('[data-match-person="example b"]');
  assert.equal(await page.locator('#responseNamesHeading').innerText(),'Names in response sheet');assert.equal(await page.locator('#prescribedNamesHeading').innerText(),'Names in prescribed targets sheet');assert.equal(await page.locator('#nameStage select, #nameStage input').count(),0);assert.equal(await page.locator('[data-match-person]').count(),1);
  await b.locator('[data-clear-match]').click();await page.locator('[data-prescription="example b prabhu ji"]').dragTo(b);assert.match(await b.locator('.match-drop').innerText(),/Example B Prabhu Ji/);await page.locator('#finishNameEdit').click();assert.equal(await page.evaluate(()=>Object.keys(targets).length),0);
  await issue.locator('[data-unmatch-person]').click();assert.match(await issue.innerText(),/Targets will stay unavailable/);assert.match(await issue.innerText(),/No match selected/);assert.equal(await issue.locator('[data-change-person]').innerText(),'Choose a match');await issue.locator('[data-undo-person]').click();assert.match(await issue.innerText(),/Example B Prabhu Ji/);
  const c=page.locator('[data-target-key="group:example c"]');assert.match(await c.innerText(),/Between half and one hour/);await c.locator('[data-use-entry="0"]').click();await page.locator('#targetReviewForm button[type=submit]').click();assert.match(await page.locator('#targetError').innerText(),/Complete/);assert.equal(await page.evaluate(()=>data.rows.length),0);
  await c.locator('[data-target-field="reading"]').fill('45');await c.locator('[data-undo-target]').click();assert.equal(await c.locator('[data-target-field="reading"]').inputValue(),'');await c.locator('[data-use-entry="0"]').click();await c.locator('[data-target-field="reading"]').fill('45');
  await page.locator('#targetReviewForm button[type=submit]').click();await page.locator('#sourcesDialog').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>targets['example a']),{rounds:8,reading:30,hearing:90});assert.deepEqual(await page.evaluate(()=>targets['example b']),{rounds:16,reading:90,hearing:120});assert.equal(await page.evaluate(()=>targets['example c'].reading),45);
  for(const [id,v]of [['startDate','2026-10-01'],['endDate','2026-10-02']]){await page.locator('#'+id).fill(v);await page.locator('#'+id).dispatchEvent('change');}
  const coverage=await page.evaluate(()=>E.summarize(prepared,'2026-10-02',2,targets,'reporting').map(s=>s.coverage));
  await page.locator('[data-open-review="values"]').click();await page.locator('[data-value-row="4"][data-value-field="reading"]').click();await page.locator('#correctedValue').fill('45');await page.locator('#valueForm button[type=submit]').click();
  assert.equal(await page.evaluate(()=>prepared.records.find(r=>r.name==='Example C').reading),45);assert.equal(await page.evaluate(()=>data.rows.find(r=>r.name==='Example C').reading),'unclear duration');
  await page.locator('[data-value-row="4"][data-value-field="reading"]').click();await page.locator('#resetValue').click();
  await page.locator('[data-value-row="4"][data-value-field="wake"]').click();await page.locator('#correctedValue').fill('04:45');await page.locator('#valueForm button[type=submit]').click();assert.equal(await page.evaluate(()=>prepared.records.find(r=>r.name==='Example C').wake),285);
  await page.locator('[data-close="valuesDialog"]').click();
  await page.locator('#dataSources').click();assert.equal(await page.locator('.identity-question').count(),0);await page.locator('#inspectMatches').click();assert.equal(await page.locator('[data-match-person]').count(),3);await b.locator('[data-clear-match]').click();await page.locator('#finishNameEdit').click();assert.match(await page.locator('#finishNote').innerText(),/unavailable for 1 person/);await page.locator('#targetReviewForm button[type=submit]').click();assert.equal(await page.evaluate(()=>targets['example b'].rounds),null);
  await page.locator('#exportSummary').click();await page.locator('#exportForm button[type=submit]').click();assert.match(await page.locator('#exportText').inputValue(),/Target unavailable/);await page.locator('[data-close="exportDialog"]').click();
  await page.locator('#dataSources').click();await page.locator('[data-change-person="example b"]').click();await page.locator('[data-prescription="example b prabhu ji"]').click();await b.locator('.match-drop').click();await page.locator('#finishNameEdit').click();await page.locator('#targetReviewForm button[type=submit]').click();
  targetA=16;failPrescription=true;await page.locator('#refreshSheets').click();await page.waitForFunction(()=>document.getElementById('googleStatus').textContent.includes('Previously loaded data'));
  assert.equal(await page.evaluate(()=>targets['example a'].rounds),8);assert.equal(await page.evaluate(()=>data.rows.length),3);
  failPrescription=false;await page.locator('#googleConnect').click();await page.waitForFunction(()=>targets['example a'].rounds===16);await page.locator('#sourcesDialog').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>E.summarize(prepared,'2026-10-02',2,targets,'reporting').map(s=>s.coverage)),coverage);
  assert.equal(await page.evaluate(()=>workspace.links.get('example b').origin),'confirmed');assert.equal(await page.locator('#startDate').inputValue(),'2026-10-01');
  readingA='Needs clarification from mentor';await page.locator('#refreshSheets').click();await page.locator('#targetStage').waitFor({state:'visible'});assert.equal(await page.locator('#nameStage').isVisible(),false);assert.equal(await page.evaluate(()=>targets['example a'].reading),30);
  const updatedA=page.locator('[data-target-key="group:example a"]');assert.match(await updatedA.innerText(),/Needs clarification from mentor/);await updatedA.locator('[data-target-field="reading"]').fill('40');await page.locator('#targetReviewForm button[type=submit]').click();assert.equal(await page.evaluate(()=>targets['example a'].reading),40);
  await page.clock.fastForward(3600000);const countBeforeExpiry=calls.length;await page.locator('#refreshSheets').click();assert.match(await page.locator('#googleStatus').innerText(),/expired/);assert.equal(calls.length,countBeforeExpiry);await page.locator('#googleConnect').click();assert.equal(await page.locator('#responseSheetName').innerText(),'No sheet selected');await pick('responses',rID);await pick('prescriptions',pID);await page.locator('#googleConnect').click();await page.locator('#sourcesDialog').waitFor({state:'hidden'});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#dataSources').click();await page.locator('#inspectMatches').click();const panes=await page.locator('.name-pane').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().x));assert.ok(panes[1]>panes[0]);await page.locator('[data-prescription="example b prabhu ji"]').click();await b.locator('.match-drop').click();assert.match(await b.locator('.match-drop').innerText(),/Example B Prabhu Ji/);assert.equal(await page.locator('#sourcesDialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);await page.screenshot({path:'/private/tmp/sadhana-setup-names-mobile.png'});
  await page.locator('#finishNameEdit').click();assert.equal(await page.locator('#sourcesDialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);await page.screenshot({path:'/private/tmp/sadhana-setup-targets-mobile.png'});await page.locator('[data-close="sourcesDialog"]').click();
  await page.locator('#importResponses').click();await page.locator('#chooseGoogle').click();await page.locator('#googleDisconnect').click();
  const beforeBroadGrant=calls.length;await page.evaluate(()=>window.testGrantedScope='https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets.readonly');
  await page.locator('#googleConnect').click();assert.match(await page.locator('#googleStatus').innerText(),/permissions beyond selected files/);assert.equal(calls.length,beforeBroadGrant);assert.equal(await page.evaluate(()=>data.rows.length),3);
  await page.evaluate(()=>window.testGrantedScope=null);await page.locator('[data-close="sourcesDialog"]').click();
  const beforeFiles=calls.length;await page.locator('#importResponses').click();await page.locator('#chooseLocal').click();
  await page.locator('#prescriptionUpload').setInputFiles({name:'wrong.csv',mimeType:'text/csv',buffer:Buffer.from('Wrong,Columns\n1,2')});await page.locator('#localSourcesForm button[type=submit]').click();await page.waitForFunction(()=>document.getElementById('localStatus').textContent.includes('Previously loaded data'));assert.equal(await page.evaluate(()=>data.rows.length),3);
  await page.locator('#prescriptionUpload').setInputFiles({name:'fictional-targets.csv',mimeType:'text/csv',buffer:Buffer.from(pcsv)});await page.locator('#localSourcesForm button[type=submit]').click();await page.locator('#sourcesDialog').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>targets['example a']),{rounds:8,reading:30,hearing:90});assert.equal(calls.length,beforeFiles);
  await page.locator('#resetData').click();assert.equal(await page.evaluate(()=>data.rows.length),0);assert.equal(await page.evaluate(()=>workspace.prescriptions),null);assert.equal(await page.locator('#refreshSheets').isVisible(),false);
  assert.equal(await page.evaluate(()=>localStorage.length),0);assert.equal(await page.evaluate(()=>sessionStorage.length),0);assert.equal(await page.locator('#responseSheetName').innerText(),'No sheet selected');assert.equal(await page.locator('#prescriptionSheetName').innerText(),'No sheet selected');
  assert.ok(calls.length>6&&calls.every(c=>c.method==='GET'&&c.auth==='Bearer fictional-browser-token'));assert.deepEqual(errors,[]);
  console.log('Simplified review passed: automatic clean loads, only unresolved cases, source evidence, undo, optional name editor, one completion action, cancel, refresh, mobile and corrections.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1);});
