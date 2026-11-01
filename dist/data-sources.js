(function(root){
  'use strict';
  const E=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.SadhanaEngine;
  const text=c=>String(c?.value??'').trim().toLowerCase();
  const positive=v=>Number.isFinite(v)&&v>0;
  function columns(row,kind){
    const h=Array.from(row,text),find=fn=>h.findIndex(fn);
    const col={timestamp:find(x=>x.includes('timestamp')),name:find(x=>x.includes('name')||x.includes('नाम'))};
    if(kind==='responses')Object.assign(col,{
      date:find(x=>x.startsWith('date')||x.includes('तिथि')),
      rounds:find(x=>x.includes('chanted')||x.includes('आज के जप')),
      reading:find(x=>x.includes('total reading')||x.includes('कुल अध्ययन')),
      hearing:find(x=>x.includes('total hearing')||x.includes('कुल सुनने')),
      sleep:find(x=>x.includes('sleeping')||x.includes('सोने का समय')),
      wake:find(x=>x.includes('wake-up')||x.includes('जागने का समय'))
    });
    else Object.assign(col,{
      rounds:find(x=>/prescribed.*chant|chant.*prescribed/.test(x)),
      reading:find(x=>/prescribed.*reading|reading.*advis/.test(x)),
      hearing:find(x=>/prescribed.*hearing|hearing.*advis/.test(x))
    });
    // A timestamp is optional in a manually maintained prescription table.
    return Object.entries(col).every(([k,v])=>v>=0||(kind==='prescriptions'&&k==='timestamp'))?col:null;
  }
  function header(sheet,kind){
    for(const r of sheet.rows){const col=columns(r.cells,kind);if(col)return {row:r.row,col};}
    return null;
  }
  function workbook(wb,X){
    return wb.SheetNames.map(name=>{
      const s=wb.Sheets[name],rows=[];if(!s['!ref'])return {name,rows};
      const range=X.utils.decode_range(s['!ref']);
      if((range.e.r-range.s.r+1)*(range.e.c+1)>3000000)throw new Error('This worksheet is too large. Export only the response or prescription table.');
      for(let r=range.s.r;r<=range.e.r;r++){
        const cells=[];for(let c=0;c<=range.e.c;c++){
          const v=s[X.utils.encode_cell({r,c})];cells.push(v?{value:v.t==='e'?null:v.v,format:v.z||''}:{});
        }
        rows.push({row:r+1,cells});
      }
      return {name,rows};
    });
  }
  function snapshot(snap){
    return (snap.sheets||[]).map(s=>{
      const byRow=new Map();
      for(const g of s.data||[])for(let i=0;i<(g.rowData||[]).length;i++){
        const n=(g.startRow||0)+i+1,cells=byRow.get(n)||[];
        (g.rowData[i].values||[]).forEach((c,j)=>{const v=c.effectiveValue||{};cells[(g.startColumn||0)+j]={value:v.numberValue??v.stringValue??v.boolValue??null,format:c.effectiveFormat?.numberFormat?.pattern||'',formatType:c.effectiveFormat?.numberFormat?.type||''};});
        byRow.set(n,cells);
      }
      return {name:s.properties.title,rows:Array.from(byRow,([row,cells])=>({row,cells})).sort((a,b)=>a.row-b.row)};
    });
  }
  function serialDate(v){
    if(typeof v!=='number')return v;
    if(!Number.isFinite(v))return null;
    const d=new Date(Date.UTC(1899,11,30)+Math.round(v*86400)*1000);return Number.isFinite(+d)?d.toISOString().slice(0,19):null;
  }
  const duration=c=>c?.formatType==='TIME'||/\[[hms]\]|h.*m.*s/i.test(c?.format||'');
  function reading(c,prescribed=false){
    const v=c?.value;
    if(prescribed&&typeof v==='string'&&/^\d+(?:\.\d+)?$/.test(v.trim()))return {kind:'minutes',value:+v};
    if(typeof v==='number'){
      if(duration(c))return {kind:'minutes',value:Math.round(v*1440*1e6)/1e6};
      if(prescribed||v===0)return {kind:'minutes',value:v};
      return v; // Unknown numeric units in historical responses stay unknown.
    }
    return v;
  }
  function responseRows(sheets){
    for(const s of sheets){const h=header(s,'responses');if(!h)continue;
      const rows=[];for(const r of s.rows.filter(r=>r.row>h.row)){
        const get=k=>r.cells[h.col[k]]||{};if(get('timestamp').value==null||get('timestamp').value==='')continue;
        const row={row:r.row,sheet:s.name,original:{}};for(const k of Object.keys(h.col)){
          const c=get(k),v=c.value;row[k]=['timestamp','date'].includes(k)?serialDate(v):['reading','hearing'].includes(k)?reading(c):['sleep','wake'].includes(k)&&typeof v==='number'&&v>=0&&v<1&&(duration(c)||c.formatType==='TIME')?{kind:'clock',value:v*1440}:v;
          row.original[k]={...c};
        }rows.push(row);
      }return rows;
    }throw new Error('Could not find the eight Google Form response columns. Keep the original header row.');
  }
  function prescriptions(sheets){
    for(const s of sheets){const h=header(s,'prescriptions');if(!h)continue;
      const rows=[];for(const r of s.rows.filter(r=>r.row>h.row)){
        const get=k=>r.cells[h.col[k]]||{},name=String(get('name').value||'').trim();if(!name)continue;
        const raw={rounds:get('rounds').value,reading:reading(get('reading'),true),hearing:reading(get('hearing'),true)};
        const target={rounds:E.rounds(raw.rounds),reading:E.minutes(raw.reading),hearing:E.minutes(raw.hearing)};
        for(const k of Object.keys(target))if(!positive(target[k])||(k!=='rounds'&&target[k]>1440))target[k]=null;
        rows.push({name,row:r.row,sheet:s.name,timestamp:serialDate(get('timestamp').value),raw,target,original:{rounds:{...get('rounds')},reading:{...get('reading')},hearing:{...get('hearing')}}});
      }if(rows.length)return rows;
      throw new Error('The prescription table has no named entries.');
    }throw new Error('Could not find Name and Prescribed Chanting, Reading and Hearing columns.');
  }
  function sheetId(input){
    const s=String(input).trim();if(/^[A-Za-z0-9_-]{20,}$/.test(s))return s;
    try{const u=new URL(s);if(u.protocol==='https:'&&u.hostname==='docs.google.com'){const m=u.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);if(m)return m[1];}}catch(_){}
    throw new Error('Enter a Google Sheets link or spreadsheet ID.');
  }
  const api={columns,header,workbook,snapshot,responseRows,prescriptions,sheetId,positive,serialDate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SadhanaSources=api;
})(typeof window!=='undefined'?window:globalThis);
