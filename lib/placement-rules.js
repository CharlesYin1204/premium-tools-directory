import {adTemplate} from './ad-slots.js';
export function placementTime(value){
 if(!value)return null;
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))return NaN;
 const n=Date.parse(value+'+08:00');
 return Number.isFinite(n)&&new Date(n+8*3600000).toISOString().slice(0,16)===value?n:NaN;
}
const scope=p=>p.location==='category'?p.category_id:p.location==='detail'?p.content_id:'';
const localTime=n=>Number.isFinite(n)?new Date(n+8*3600000).toISOString().slice(0,16):null;
export function placementConflictDetails(d,peers,capacity){
 const start=placementTime(d.start_at)??-Infinity,end=placementTime(d.end_at)??Infinity;
 const applicable=peers.filter(p=>p.location===d.location&&scope(p)===scope(d)&&!p.paused).sort((a,b)=>String(a.id||a.entry_id).localeCompare(String(b.id||b.entry_id)));
 const detail=(type,device,start,end,items)=>({type,device,location:d.location,scope_id:scope(d)||null,start_at:localTime(start),end_at:localTime(end),capacity,peers:items.map(p=>({id:p.id||null,name:p.name||p.id||p.entry_id,entry_id:p.entry_id}))});
 for(const device of d.device==='all'?['pc','h5']:[d.device]){
  const intervals=applicable.filter(p=>p.device==='all'||p.device===device).map(p=>({p,start:Math.max(start,placementTime(p.start_at)??-Infinity),end:Math.min(end,placementTime(p.end_at)??Infinity)})).filter(p=>p.start<p.end);
  const mixed=intervals.find(({p})=>adTemplate(p)!==adTemplate(d));
  if(mixed)return detail('template',device,mixed.start,mixed.end,[mixed.p]);
  const duplicate=intervals.find(({p})=>p.entry_id===d.entry_id);
  if(duplicate)return detail('duplicate',device,duplicate.start,duplicate.end,[duplicate.p]);
  const points=[...new Set(intervals.flatMap(p=>[p.start,p.end]))].sort((a,b)=>a-b);
  for(let i=0;i<points.length-1;i++){
   const from=points[i],to=points[i+1],active=intervals.filter(p=>p.start<=from&&p.end>from);
   if(active.length+1>capacity)return detail('capacity',device,from,to,active.map(p=>p.p));
  }
 }
 return null;
}
export function placementConflict(d,peers,capacity){return placementConflictDetails(d,peers,capacity)?.type||null;}
export function placementConflictMessage(c){
 const reason={template:'同位置与排期不能混用卡片和横幅模板',duplicate:'同位置、设备及有效期内已有相同入口',capacity:'此位置在重叠时段达到容量上限'}[c.type];
 const names=c.peers.map(p=>p.name+(p.id?'（'+p.id+'）':'')).join('、');
 return reason+'。设备：'+c.device.toUpperCase()+'；重叠时段（上海时间，结束不含）：'+(c.start_at?.replace('T',' ')||'不限开始')+' 至 '+(c.end_at?.replace('T',' ')||'不限结束')+'；冲突广告：'+names+'。调整后重新检查；此处列出首个冲突时段。';
}
