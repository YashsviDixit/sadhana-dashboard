(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const E=node?require('./engine.js'):root.SadhanaEngine,M=node?require('./name-matching.js'):root.SadhanaMatching;
  const fields=['rounds','reading','hearing','sleep','wake'];
  class Workspace{
    constructor(){this.responses=null;this.prescriptions=null;this.groups=new Map();this.links=new Map();this.resolved=new Map();this.manual=Object.create(null);this.corrections=Object.create(null);}
    copy(){
      const w=new Workspace();w.responses=this.responses;w.prescriptions=this.prescriptions;w.groups=new Map(this.groups);w.links=new Map(Array.from(this.links,([k,v])=>[k,{...v}]));w.resolved=new Map(Array.from(this.resolved,([k,v])=>[k,{...v}]));
      w.manual=Object.assign(Object.create(null),this.manual);w.corrections=JSON.parse(JSON.stringify(this.corrections));return w;
    }
    setResponses(rows,source){
      const same=this.responses?.key===source.key;
      if(!same){this.links.clear();this.manual=Object.create(null);this.corrections=Object.create(null);}
      else{
        const prior=new Map(this.responses.rows.map(r=>[r.row,r]));
        for(const r of rows){
          const old=prior.get(r.row),sameEntry=old&&['name','date','timestamp'].every(k=>JSON.stringify(old[k])===JSON.stringify(r[k]));
          for(const field of fields)if(Object.hasOwn(this.corrections[r.row]||{},field)&&(!sameEntry||JSON.stringify(old[field])!==JSON.stringify(r[field])))delete this.corrections[r.row][field];
        }
        const present=new Set(rows.map(r=>String(r.row)));for(const n of Object.keys(this.corrections))if(!present.has(n))delete this.corrections[n];
      }
      this.responses={...source,rows};
    }
    setPrescriptions(rows,source){
      const next=M.groups(rows),same=this.prescriptions?.key===source.key;
      if(!same){this.links.clear();this.resolved.clear();this.manual=Object.create(null);}
      for(const [id]of this.resolved)if(JSON.stringify(this.groups.get(id)?.entries)!==JSON.stringify(next.get(id)?.entries))this.resolved.delete(id);
      this.groups=next;this.prescriptions={...source,rows};
    }
    targets(names){
      this.links=M.reconcile(names,this.groups,this.links);
      return this.prescriptions?M.targets(names,this.groups,this.links,this.resolved,this.manual):Object.assign(Object.create(null),this.manual);
    }
    confirmLink(id,group){if(group!==null&&!this.groups.has(group))throw new Error('Choose an existing prescription name.');this.links.set(id,{group,origin:'confirmed'});delete this.manual[id];}
    confirmLinks(proposals){
      for(const p of proposals.values())if(p.group!==null&&!this.groups.has(p.group))throw new Error('Choose an existing prescription name.');
      for(const [id,p]of proposals){
        const old=this.links.get(id);if(old&&old.group===p.group)continue;
        this.confirmLink(id,p.group);
      }
    }
    confirmTarget(group,target){if(!this.groups.has(group)||!M.valid(target)||!Number.isInteger(target.rounds)||target.rounds>1000||target.reading>1440||target.hearing>1440)throw new Error('Enter positive targets: whole rounds up to 1000 and minutes up to 1440.');this.resolved.set(group,{...target});}
    correct(row,field,value,allIdentical=false){
      if(!fields.includes(field)||!this.responses)throw new Error('Choose a practice value.');
      const original=this.responses.rows.find(r=>r.row===row);if(!original)throw new Error('Response row no longer exists.');
      const parsed=E.interpret(field,value).value;if(parsed===null)throw new Error('Enter a valid value in the requested units.');
      for(const r of this.responses.rows)if(r.row===row||(allIdentical&&JSON.stringify(r[field])===JSON.stringify(original[field]))){
        this.corrections[r.row]??=Object.create(null);this.corrections[r.row][field]=value;
      }
    }
  }
  if(node)module.exports={Workspace};else root.SadhanaSourceWorkspace={Workspace};
})(typeof window!=='undefined'?window:globalThis);
