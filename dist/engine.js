(function(root){
  'use strict';
  const DAY=86400000;
  const aliases=Object.create(null);
  // Explicit, field-specific spellings observed in the source data. Match the
  // whole entry; do not extract a convenient number from an unclear sentence.
  const valueKey=v=>typeof v==='string'?v.trim().toLowerCase().replace(/\s+/g,' '):null;
  const valueDictionary=Object.freeze({
    rounds:Object.freeze({'sixteen':16,'16,':16}),
    minutes:Object.freeze({
      '25min.':25,'30min.':30,'50 mint':50,'45 mints':45,'30 mint':30,
      '60 mints':60,'20 mints':20,'one and half hours':90,
      '120 minutes.':120,'1hrs. 30min':90,'1hrs. 35min':95
    }),
    clock:Object.freeze({
      '12:30 a.m':30,'12:30a.m':30,'1:30a.m':90,'2.30 a.m':150,
      '2.10 a.m':130,'4:30 a.m':270,'3:45 p.m':945,'11:30 p m':1410,
      '11pm.':1380,'1.20am.':80,'12.30am.':30,'10.20pm.':1340,
      '10.50pm.':1370,"10'50pm":1370,'10.30pm.':1350,'10.45pm.':1365,
      '10.30.pm':1350,'10.40.pm':1360,'10.25.pm':1345,'11.pm':1380,
      '10.pm':1320,'3am.':180,'3.am':180,'4. am':240,'4.am':240,
      '3.pm':900,'3pm.':900,'5.am':300
    })
  });
  function dictionaryValue(kind,v){
    const k=valueKey(v);return k!==null&&Object.hasOwn(valueDictionary[kind],k)?valueDictionary[kind][k]:null;
  }
  const key=name=>aliases[String(name||'').trim().toLowerCase()]||String(name||'').trim().toLowerCase();
  const iso=d=>d.toISOString().slice(0,10);
  const shift=(date,n)=>iso(new Date(Date.parse(date+'T00:00:00Z')+n*DAY));
  const distance=(a,b)=>Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/DAY);
  function date(v){
    if(v instanceof Date) return iso(v);
    const s=String(v||'').trim(); let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!m){ const x=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/); if(x) m=[x[0],x[3],x[1].padStart(2,'0'),x[2].padStart(2,'0')]; }
    if(!m||+m[1]<2000||+m[1]>2100) return null;
    const d=m[1]+'-'+m[2]+'-'+m[3]; const t=new Date(d+'T00:00:00Z');
    return Number.isFinite(+t)&&iso(t)===d?d:null;
  }
  function timestamp(v){
    if(v instanceof Date) return {date:iso(v),order:+v};
    const d=date(v); if(!d)return null;
    const s=String(v); let time=s.match(/[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    let hh=time?+time[1]:0, mm=time?+time[2]:0, ss=time?+time[3]||0:0;
    if(/pm/i.test(s)&&hh<12)hh+=12;if(/am/i.test(s)&&hh===12)hh=0;
    if(hh>23||mm>59||ss>59)return null;
    return {date:d,order:Date.parse(d+'T00:00:00Z')+hh*3600000+mm*60000+ss*1000};
  }
  function rounds(v){
    const mapped=dictionaryValue('rounds',v);if(mapped!==null)return mapped;
    if(typeof v==='number')return Number.isInteger(v)&&v>=0?v:null;
    const s=String(v??'').trim().toLowerCase();if(['nil','zero'].includes(s))return 0;
    const m=s.match(/^(\d+)\s*(?:\+|rounds?|rounds?\s*\+)?\s*$/); return m?+m[1]:null;
  }
  function minutes(v){
    const mapped=dictionaryValue('minutes',v);if(mapped!==null)return mapped;
    if(v&&v.kind==='minutes') return Number.isFinite(v.value)&&v.value>=0&&v.value<=1440?v.value:null;
    if(typeof v==='number')return null; // Raw numeric units are not guessed.
    let s=String(v??'').trim().toLowerCase();if(['nil','zero','0'].includes(s))return 0;
    s=s.replace(/\bone\b/g,'1').replace(/\btwo\b/g,'2').replace(/\bthree\b/g,'3').replace(/\bhalf\s*(?:hr|hour)\b/g,'30 min');
    let m=s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?$/);let n=null;
    if(m&&+m[2]<60&&+(m[3]||0)<60)n=+m[1]*60 + +m[2] + +(m[3]||0)/60;
    else {m=s.match(/^(?:(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h))?\s*(?:(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m))?\s*(?:(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s))?$/);if(m&&m.slice(1).some(Boolean))n=+(m[1]||0)*60 + +(m[2]||0) + +(m[3]||0)/60;}
    return n!==null&&n>=0&&n<=1440?n:null;
  }
  function clock(v){
    const mapped=dictionaryValue('clock',v);if(mapped!==null)return mapped;
    if(v&&v.kind==='clock')return v.value>=0&&v.value<1440?v.value:null;
    if(typeof v==='number'){if(Number.isInteger(v)&&v>=0&&v<=23)return v*60;if(Number.isInteger(v)&&v>=100&&v<=2359)v=String(v).padStart(4,'0');else return null;}
    let s=String(v??'').trim().toLowerCase().replace(/\s/g,'');let m=s.match(/^(\d{1,2})(?:[:.](\d{1,2}))?(?::\d{2})?(am|pm)$/);
    if(m){let h=+m[1],min=+(m[2]||0);if(h<1||h>12||min>59)return null;return (h%12+(m[3]==='pm'?12:0))*60+min;}
    m=s.match(/^(\d{1,2})[:.](\d{1,2})(?::\d{2})?$/)||s.match(/^(\d{2})(\d{2})$/);
    if(m)return +m[1]<24&&+m[2]<60?+m[1]*60 + +m[2]:null;
    if(/^\d{1,2}$/.test(s)&&+s<24)return +s*60;return null;
  }
  function completion(actual,target,type){
    if(actual===null||!Number.isFinite(target)||target<=0)return null;
    const p=actual/target;
    return type==='rounds'?(p>=1?20:p>=.8?15:p>.5?10:p>0?8:0):(p>=1?20:p>=.7?15:p>=.5?10:p>=.2?5:0);
  }
  // Shared result contract for source adapters and a future mentor review UI.
  // The original input is retained even when a dictionary conversion succeeds.
  function interpret(field,raw){
    const kind=field==='rounds'?'rounds':['reading','hearing'].includes(field)?'minutes':['sleep','wake'].includes(field)?'clock':null;
    if(!kind)throw new Error('Unknown practice field');
    const value=({rounds,minutes,clock})[kind](raw);
    return {raw,value,status:value===null?'needs-confirmation':dictionaryValue(kind,raw)!==null?'dictionary':'parsed'};
  }
  function scores(r,t){
    const s={rounds:completion(r.rounds,t.rounds,'rounds'),reading:completion(r.reading,t.reading),hearing:completion(r.hearing,t.hearing),sleep:r.sleep===null?null:r.sleep<720?4:r.sleep<1320?20:r.sleep<1380?15:8,wake:r.wake===null?null:r.wake<=300?20:r.wake<=360?15:r.wake<=420?8:4};
    s.total=Object.values(s).some(v=>v===null)?null:Object.values(s).reduce((a,b)=>a+b,0);return s;
  }
  function prepare(data){
    const names=new Map((data.roster||[]).map(n=>[key(n),n])); const flags=[], records=[];
    for(const row of data.rows){
      const k=key(row.name);if(!k)continue;if(!names.has(k))names.set(k,String(row.name).trim());
      const correction=data.valueOverrides?.[row.row]||{},input=f=>Object.hasOwn(correction,f)?correction[f]:row[f];
      const r={...row,id:k,practice:date(row.date),submitted:timestamp(row.timestamp),rounds:rounds(input('rounds')),reading:minutes(input('reading')),hearing:minutes(input('hearing')),sleep:clock(input('sleep')),wake:clock(input('wake')),corrections:{...correction}};
      const add=(type,message)=>flags.push({id:k,name:names.get(k),row:row.row,type,message,date:r.practice,timestamp:row.timestamp,raw:row});
      if(!r.practice)add('Invalid date','Practice date cannot be used: '+String(row.date));
      if(!r.submitted)add('Invalid timestamp','Submission timestamp cannot be read');
      if(r.practice&&r.submitted&&r.practice>r.submitted.date)add('Future date','Practice date '+r.practice+' is later than submission date '+r.submitted.date);
      for(const f of ['rounds','reading','hearing','sleep','wake'])if(r[f]===null)add('Check '+f,'Unclear or invalid '+f+': '+displayRaw(row[f]));
      r.usable=!!(r.practice&&r.submitted&&r.practice<=r.submitted.date);
      records.push(r);
    }
    const groups=new Map();for(const r of records.filter(r=>r.usable)){const k=r.id+'|'+r.practice;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
    const days=new Map();for(const [k,group] of groups){group.sort((a,b)=>a.submitted.order-b.submitted.order||a.row-b.row);days.set(k,group[group.length-1]);if(group.length>1)flags.push({id:group[0].id,name:names.get(group[0].id),row:group[group.length-1].row,type:'Duplicate day',message:group.length+' submissions for '+group[0].practice+'; latest retained',date:group[0].practice,raw:group[group.length-1]});}
    const latest=records.filter(r=>r.submitted).map(r=>r.submitted.date).sort().pop();
    return {names,records,days,flags,latest};
  }
  function displayRaw(v){return v&&typeof v==='object'?v.kind+': '+v.value:String(v??'blank');}
  function meetsTarget(r,t,axis){
    if(!r)return null;
    if(axis==='reporting')return true;
    const v=axis==='score'?r.scores.total:r[axis];
    if(v===null)return null;
    if(['rounds','reading','hearing'].includes(axis)&&(!Number.isFinite(t[axis])||t[axis]<=0))return null;
    return axis==='score'?v>=80:axis==='wake'?v<=300:axis==='sleep'?v>=720&&v<1320:v>=t[axis];
  }
  function concernStreaks(history,calendar,t,axis){
    const streaks=[];let run=null;
    history.forEach((r,i)=>{
      const reason=!r?'missing':meetsTarget(r,t,axis)===false?'below':null;
      if(!reason){run=null;return;}
      if(!run){run={start:calendar[i],end:calendar[i],length:0,missing:0,below:0,ongoing:false};streaks.push(run);}
      run.end=calendar[i];run.length++;run[reason]++;run.ongoing=i===history.length-1;
    });
    return streaks;
  }
  function summarize(prepared,end,length,targets,axis='reporting'){
    const start=shift(end,1-length);const calendar=Array.from({length},(_,i)=>shift(start,i));
    return Array.from(prepared.names,([id,name])=>{
      const t=Object.hasOwn(targets,id)?targets[id]:{rounds:16,reading:60,hearing:60};
      const all=prepared.records.filter(r=>r.id===id&&r.submitted&&r.submitted.date<=end);
      const history=calendar.map(d=>{const r=prepared.days.get(id+'|'+d);return r?{...r,scores:scores(r,t)}:null;});
      const observed=history.filter(Boolean),known=observed.filter(r=>axis==='reporting'||(axis==='score'?r.scores.total!==null:r[axis]!==null));
      const met=r=>meetsTarget(r,t,axis);
      const meets=known.filter(met).length;const value=r=>axis==='reporting'?1:axis==='score'?r.scores.total:r[axis];
      const avg=arr=>arr.length?arr.reduce((a,r)=>a+value(r),0)/arr.length:null;
      const midpoint=Math.floor(length/2);const early=history.slice(0,midpoint).filter(r=>r&&known.includes(r)),late=history.slice(midpoint).filter(r=>r&&known.includes(r));
      const trend=early.length>=3&&late.length>=3?avg(late)-avg(early):null;
      const last=all.map(r=>r.submitted.date).sort().pop()||null;
      let gap=0;for(let i=history.length-1;i>=0&&!history[i];i--)gap++;
      const streaks=concernStreaks(history,calendar,t,axis);
      const targetKnown=axis==='score'?['rounds','reading','hearing'].every(k=>Number.isFinite(t[k])&&t[k]>0):!['rounds','reading','hearing'].includes(axis)||Number.isFinite(t[axis])&&t[axis]>0;
      return {id,name,target:t,targetKnown,history,streaks,observed:observed.length,known:known.length,meets,rate:known.length&&targetKnown?meets/known.length:null,coverage:observed.length/length,average:avg(known),trend,last,gap,flags:prepared.flags.filter(f=>f.id===id),calendar};
    });
  }
  // Export policy: reuse PDF component marks, but give missing/unreadable components
  // no credit and include every selected date. Do not change dashboard summaries.
  function exportRanking(prepared,end,length,targets,component){
    const components=['rounds','reading','hearing','wake','sleep'];
    if(!['score','reporting',...components].includes(component))throw new Error('Unknown export ranking');
    return summarize(prepared,end,length,targets,'score').map(s=>{
      const total=s.history.reduce((sum,r)=>sum+(!r?0:component==='score'?components.reduce((n,k)=>n+(r.scores[k]??0),0):(r.scores[component]??0)),0);
      const targetKnown=component==='score'?['rounds','reading','hearing'].every(k=>Number.isFinite(s.target[k])&&s.target[k]>0):!['rounds','reading','hearing'].includes(component)||Number.isFinite(s.target[component])&&s.target[component]>0;
      return {...s,metric:!targetKnown?null:component==='reporting'?s.coverage:total/length};
    }).sort((a,b)=>(a.metric===null)-(b.metric===null)||(a.metric??0)-(b.metric??0)||a.coverage-b.coverage||a.name.localeCompare(b.name));
  }
  const api={key,date,timestamp,minutes,clock,rounds,interpret,valueDictionary,scores,prepare,summarize,exportRanking,shift,distance,displayRaw,meetsTarget,concernStreaks};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SadhanaEngine=api;
})(typeof window!=='undefined'?window:globalThis);
