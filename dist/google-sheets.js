(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports,S=node?require('./data-sources.js'):root.SadhanaSources;
  const CLIENT_ID='922908907926-6qrk1a8qlnpeal0hind7j4aiummhd8if.apps.googleusercontent.com';
  const SCOPE='https://www.googleapis.com/auth/spreadsheets.readonly';
  const GRID_FIELDS='spreadsheetId,properties(title,locale,timeZone),sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(effectiveValue,effectiveFormat/numberFormat))))';
  const quoted=name=>"'"+name.replace(/'/g,"''")+"'";
  function column(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
  async function request(id,params,token,fetcher,signal){
    const reply=await fetcher('https://sheets.googleapis.com/v4/spreadsheets/'+id+'?'+new URLSearchParams(params),{method:'GET',headers:{Authorization:'Bearer '+token},cache:'no-store',signal});
    if(!reply.ok){
      if(reply.status===401)throw new Error('Google authorization expired. Sign in again to refresh.');
      if(reply.status===403)throw new Error('Google denied access. Check that this account can read the sheet and is allowed to use the Google application.');
      if(reply.status===404)throw new Error('Spreadsheet not found or not shared with this Google account.');
      if(reply.status===429)throw new Error('Google is receiving too many requests. Wait a moment, then refresh.');
      throw new Error('Google Sheets request failed (HTTP '+reply.status+'). Try again.');
    }
    let body;try{body=await reply.json();}catch(_){throw new Error('Google returned an unreadable response. Try again.');}
    if(body.spreadsheetId!==id||!Array.isArray(body.sheets))throw new Error('Google returned an unexpected spreadsheet structure.');
    return body;
  }
  async function readSource(input,kind,tab,token,fetcher,signal){
    const id=S.sheetId(input),meta=await request(id,{fields:'spreadsheetId,properties(title,locale,timeZone),sheets/properties'},token,fetcher,signal);
    const candidates=meta.sheets.filter(s=>s.properties.sheetType==='GRID'&&(!tab||s.properties.title===tab));
    if(!candidates.length)throw new Error('The selected worksheet was not found. Check the worksheet name.');
    let chosen,match;
    for(const candidate of candidates){
      const title=candidate.properties.title,width=Math.min(26,candidate.properties.gridProperties?.columnCount||26),height=Math.min(20,candidate.properties.gridProperties?.rowCount||20);
      const preview=await request(id,{ranges:quoted(title)+'!A1:'+column(width-1)+height,fields:GRID_FIELDS},token,fetcher,signal);
      const sheet=S.snapshot(preview).find(s=>s.name===title),h=sheet&&S.header(sheet,kind);
      if(h){if(chosen)throw new Error('More than one worksheet has these columns. Enter the worksheet name to choose one.');chosen=candidate;match=h;}
    }
    if(!chosen)throw new Error('No worksheet has the required '+(kind==='responses'?'eight response':'prescription')+' headings in its first 20 rows and 26 columns. Check the source and worksheet name.');
    const title=chosen.properties.title,last=column(Math.max(...Object.values(match.col)));
    const body=await request(id,{ranges:quoted(title)+'!A1:'+last,fields:GRID_FIELDS},token,fetcher,signal);
    const sheets=S.snapshot(body),rows=kind==='responses'?S.responseRows(sheets):S.prescriptions(sheets);
    return {rows,key:'google:'+id+':'+chosen.properties.sheetId,id,tab:title,title:meta.properties.title,timezone:meta.properties.timeZone,loadedAt:new Date().toISOString(),kind:'google'};
  }
  async function readPair(config,token,fetcher=root.fetch.bind(root),signal){
    const jobs=[['responses',config.responses,config.responseTab],['prescriptions',config.prescriptions,config.prescriptionTab]];
    const results=await Promise.all(jobs.map(async([kind,input,tab])=>{try{return await readSource(input,kind,tab?.trim(),token,fetcher,signal);}catch(e){if(e.name==='AbortError')throw e;throw new Error((kind==='responses'?'Responses':'Prescriptions')+': '+e.message);}}));
    return {responses:results[0],prescriptions:results[1]};
  }
  const api={CLIENT_ID,SCOPE,readPair};if(node)module.exports=api;else root.SadhanaGoogleSheets=api;
})(typeof window!=='undefined'?window:globalThis);
