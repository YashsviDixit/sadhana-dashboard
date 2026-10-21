(function(root){
  'use strict';
  const DAY=86400000;
  const aliases={};
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
    if(typeof v==='number')return Number.isInteger(v)&&v>=0?v:null;
    const s=String(v??'').trim().toLowerCase();if(['nil','zero'].includes(s))return 0;
    const m=s.match(/^(\d+)\s*(?:\+|rounds?|rounds?\s*\+)?\s*$/); return m?+m[1]:null;
  }
  function minutes(v){
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
  function scores(r,t){
    const s={rounds:completion(r.rounds,t.rounds,'rounds'),reading:completion(r.reading,t.reading),hearing:completion(r.hearing,t.hearing),sleep:r.sleep===null?null:r.sleep<720?4:r.sleep<1320?20:r.sleep<1380?15:8,wake:r.wake===null?null:r.wake<=300?20:r.wake<=360?15:r.wake<=420?8:4};
    s.total=Object.values(s).some(v=>v===null)?null:Object.values(s).reduce((a,b)=>a+b,0);return s;
  }
  function prepare(data){
    const names=new Map((data.roster||[]).map(n=>[key(n),n])); const flags=[], records=[];
    for(const row of data.rows){
      const k=key(row.name);if(!k)continue;if(!names.has(k))names.set(k,String(row.name).trim());
      const r={...row,id:k,practice:date(row.date),submitted:timestamp(row.timestamp),rounds:rounds(row.rounds),reading:minutes(row.reading),hearing:minutes(row.hearing),sleep:clock(row.sleep),wake:clock(row.wake)};
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
  function summarize(prepared,end,length,targets,axis='reporting'){
    const start=shift(end,1-length);const calendar=Array.from({length},(_,i)=>shift(start,i));
    return Array.from(prepared.names,([id,name])=>{
      const t=targets[id]||{rounds:16,reading:60,hearing:60};
      const all=prepared.records.filter(r=>r.id===id&&r.submitted&&r.submitted.date<=end);
      const history=calendar.map(d=>{const r=prepared.days.get(id+'|'+d);return r?{...r,scores:scores(r,t)}:null;});
      const observed=history.filter(Boolean),known=observed.filter(r=>axis==='reporting'||(axis==='score'?r.scores.total!==null:r[axis]!==null));
      const met=r=>axis==='reporting'?true:axis==='score'?r.scores.total>=80:axis==='wake'?r.wake<=300:axis==='sleep'?r.sleep>=720&&r.sleep<1320:r[axis]>=t[axis];
      const meets=known.filter(met).length;const value=r=>axis==='reporting'?1:axis==='score'?r.scores.total:r[axis];
      const avg=arr=>arr.length?arr.reduce((a,r)=>a+value(r),0)/arr.length:null;
      const midpoint=Math.floor(length/2);const early=history.slice(0,midpoint).filter(r=>r&&known.includes(r)),late=history.slice(midpoint).filter(r=>r&&known.includes(r));
      const trend=early.length>=3&&late.length>=3?avg(late)-avg(early):null;
      const last=all.map(r=>r.submitted.date).sort().pop()||null;
      let gap=0;for(let i=history.length-1;i>=0&&!history[i];i--)gap++;
      return {id,name,target:t,history,observed:observed.length,known:known.length,meets,rate:known.length?meets/known.length:null,coverage:observed.length/length,average:avg(known),trend,last,gap,flags:prepared.flags.filter(f=>f.id===id),calendar};
    });
  }
  const api={key,date,timestamp,minutes,clock,rounds,scores,prepare,summarize,shift,distance,displayRaw};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SadhanaEngine=api;
})(typeof window!=='undefined'?window:globalThis);
