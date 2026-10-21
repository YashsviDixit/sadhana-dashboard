const path=require('node:path');const fs=require('node:fs');
let chromium;try{({chromium}=require('playwright-core'));}catch(_){({chromium}=require('../../.tools/browser-qa/node_modules/playwright-core'));}
const executable=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'].find(p=>fs.existsSync(p));
if(!executable)throw new Error('Set CHROME_PATH to an installed Chrome/Chromium executable.');
module.exports={chromium,executable,appUrl:require('node:url').pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href};
