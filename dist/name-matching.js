(function(root){
  'use strict';
  const E=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.SadhanaEngine;
  const empty=()=>({rounds:null,reading:null,hearing:null});
  const valid=t=>['rounds','reading','hearing'].every(k=>Number.isFinite(t[k])&&t[k]>0);
  function groups(rows){
    const map=new Map();for(const r of rows){const id=E.key(r.name);if(!map.has(id))map.set(id,{id,name:r.name,entries:[]});map.get(id).entries.push(r);}
    for(const g of map.values()){
      const first=g.entries[0].target;
      g.target=valid(first)&&g.entries.every(r=>valid(r.target)&&['rounds','reading','hearing'].every(k=>Math.abs(r.target[k]-first[k])<.0001))?{...first}:null;
      g.common=Object.fromEntries(['rounds','reading','hearing'].map(k=>[k,Number.isFinite(first[k])&&first[k]>0&&g.entries.every(r=>Number.isFinite(r.target[k])&&Math.abs(r.target[k]-first[k])<.0001)?first[k]:null]));
    }return map;
  }
  function normalize(name){return E.key(name).normalize('NFKC').replace(/[.,]/g,' ').split(/\s+/).filter(x=>x&&!['dr','shri','sri','prabhu','ji','mata','mataji'].includes(x)).join(' ');}
  function similarity(a,b){
    a=normalize(a);b=normalize(b);if(!a||!b)return 0;if(a===b)return .99;
    const aa=a.split(' '),bb=b.split(' '),common=aa.filter(t=>bb.includes(t)).length;
    // A shared first name alone is insufficient when both names have surnames.
    const overlap=common/Math.max(aa.length,bb.length);
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=next;}
    const edit=1-prev[b.length]/Math.max(a.length,b.length);
    return Math.max(overlap,edit*.9,common===1&&Math.min(aa.length,bb.length)===1?.72:0);
  }
  function suggestions(name,map){return [...map.values()].map(g=>({id:g.id,score:similarity(name,g.name)})).filter(g=>g.score>=.55).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,3);}
  function reconcile(names,map,previous=new Map()){
    const result=new Map();for(const [id]of names){
      const old=previous.get(id);
      if(old&&(old.group===null||map.has(old.group)))result.set(id,{...old});
      else if(map.has(id))result.set(id,{group:id,origin:'exact'});
    }return result;
  }
  function proposals(names,map,links){
    return new Map(Array.from(names,([id,name])=>{
      const link=links.get(id),options=suggestions(name,map);
      return [id,{group:link?link.group:options[0]?.id??null,origin:link?link.origin:options.length?'suggested':'unmatched'}];
    }));
  }
  function targets(names,map,bindings,resolved=new Map(),overrides={}){
    const result={};for(const [id]of names){
      const g=map.get(bindings.get(id)?.group),t=g?(resolved.get(g.id)||g.target):null;
      Object.defineProperty(result,id,{value:overrides[id]||t||empty(),enumerable:true,writable:true,configurable:true});
    }return result;
  }
  const api={groups,similarity,suggestions,reconcile,proposals,targets,empty,valid};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SadhanaMatching=api;
})(typeof window!=='undefined'?window:globalThis);
