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
  const titles=new Set(['dr','doctor','prof','mr','mrs','ms','smt','shri','sri','prabhu','prabhuji','ji','mata','mataji']);
  function tokens(name){
    return String(name||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{M}\p{N}\s]/gu,' ').trim().split(/\s+/).filter(x=>x&&!titles.has(x));
  }
  // Adjacent letter transpositions count as one spelling edit. This operates
  // on individual name parts, never on a short name versus a whole long name.
  function tokenScore(a,b){
    if(a===b)return 1;
    if(a.length===1||b.length===1)return a[0]===b[0]? .72:0;
    const d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
    }
    return 1-d[a.length][b.length]/Math.max(a.length,b.length);
  }
  function compareNames(left,right){
    const a=tokens(left),b=tokens(right);if(!a.length||!b.length)return {score:0,reason:''};
    if(a.join(' ')===b.join(' '))return {score:.99,reason:'Same name after removing titles and punctuation'};
    if(a.length===1||b.length===1){
      const short=a.length===1?a:b,long=a.length===1?b:a,score=tokenScore(short[0],long[0]);
      if(score===1)return {score:.91,reason:'Same first name; the other source includes more name parts'};
      if(short[0].length>=5&&long[0].length>=5&&score>=.84)return {score:.80+score*.10,reason:'Similar first-name spelling; the other source includes more name parts'};
      return {score:0,reason:''};
    }
    const edges=[];
    for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
      const score=tokenScore(a[i],b[j]);if(score>=.72)edges.push({i,j,score});
    }
    edges.sort((x,y)=>y.score-x.score||x.i-y.i||x.j-y.j);
    const usedA=new Set(),usedB=new Set(),pairs=[];
    for(const edge of edges)if(!usedA.has(edge.i)&&!usedB.has(edge.j)){usedA.add(edge.i);usedB.add(edge.j);pairs.push(edge);}
    const first=pairs.find(p=>p.i===0),last=pairs.find(p=>p.i===a.length-1);
    // A common surname, or a common first name with conflicting surnames, is
    // insufficient. Every part on the shorter side must have supporting evidence.
    if(!first)return {score:0,reason:''};
    if(pairs.length<Math.min(a.length,b.length)){
      if(first.j===0&&first.score>=.84&&last?.j===b.length-1&&last.score>=.84)return {score:.76,reason:'First and last names are close; check the different middle name'};
      return {score:0,reason:''};
    }
    const average=pairs.reduce((sum,p)=>sum+p.score,0)/pairs.length;
    if(average<.84)return {score:0,reason:''};
    const weak=pairs.filter(p=>p.score<.84);
    if(weak.length&&!weak.every(p=>p.i===0&&p.j===0&&last?.score===1))return {score:.78,reason:'Some name parts are close; check the spelling before choosing'};
    const initial=pairs.some(p=>a[p.i].length===1||b[p.j].length===1),fuzzy=pairs.some(p=>p.score<1);
    return {score:Math.min(.97,.82+average*.15),reason:initial?'Matching initials and other name parts':fuzzy?'Matching name parts with a small spelling variation':a.length!==b.length?'Matching name parts; one source includes an extra name part':'Same name parts in a different order'};
  }
  function similarity(a,b){return compareNames(a,b).score;}
  function suggestions(name,map){return [...map.values()].map(g=>({id:g.id,...compareNames(name,g.name)})).filter(g=>g.score>=.72).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,3);}
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
      const leading=options[0],clear=leading&&leading.score>=.84&&(!options[1]||leading.score-options[1].score>=.06);
      return [id,{group:link?link.group:clear?leading.id:null,origin:link?link.origin:clear?'suggested':options.length?'ambiguous':'unmatched',reason:link?'':clear?leading.reason:options.length?'Several names are close, or the evidence is weak. Choose the prescription name.':'No convincing prescription name found.',candidates:options}];
    }));
  }
  function targets(names,map,bindings,resolved=new Map(),overrides={}){
    const result={};for(const [id]of names){
      const g=map.get(bindings.get(id)?.group),t=g?(resolved.get(g.id)||g.target):null;
      Object.defineProperty(result,id,{value:overrides[id]||t||empty(),enumerable:true,writable:true,configurable:true});
    }return result;
  }
  const api={groups,similarity,compareNames,suggestions,reconcile,proposals,targets,empty,valid};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SadhanaMatching=api;
})(typeof window!=='undefined'?window:globalThis);
