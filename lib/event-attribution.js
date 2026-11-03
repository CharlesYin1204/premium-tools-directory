import {createHash} from 'node:crypto';
import {query} from './db.js';
import {AppError} from './security.js';
export const attributionId=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(value)?value:null;
const same=(a,b,fields)=>fields.every(k=>(a[k]??null)===(b[k]??null));
const context=(a,b)=>same(a,b,['session_id','page'])&&!!a.is_test===!!b.is_test;
const instant=s=>s instanceof Date?s.getTime():Date.parse(String(s).replace(' ','T').replace(/Z?$/,'Z'));
export async function attributeEvent(data,timing,write,db){
 const d={...data,page_view_id:attributionId(data.page_view_id),impression_id:null,impression_key:null,attribution_status:null};
 if(d.event_name==='page_view')d.page_view_id=d.event_id;
 const ad=!!d.placement_id&&['entry_impression','entry_click'].includes(d.event_name);
 if(ad&&d.event_name==='entry_impression'){
  if(data.page_view_id!=null&&!d.page_view_id)throw new AppError(422,'页面访问编号无效');
  if(d.page_view_id){
   const [pv]=await query("SELECT * FROM events WHERE event_id=? AND event_name='page_view'",[d.page_view_id],db);
   if(!pv||!context(pv,d)||instant(pv.received_at||pv.occurred_at)>instant(timing.received_at))throw new AppError(409,'页面访问记录尚未确认或不匹配');
   d.page_view_id=pv.page_view_id||pv.event_id; // Use stored spelling: MySQL IDs compare case-insensitively.
   d.impression_key=createHash('sha256').update(JSON.stringify([d.page_view_id,d.placement_id,d.slot_id])).digest('hex');
   d.impression_id=d.event_id;d.attribution_status='recorded';
  }else d.attribution_status='unverified'; // Rolling upgrades: keep old-client events, never invent receipts.
 }
 if(ad&&d.event_name==='entry_click'){
  d.impression_id=attributionId(data.impression_id);
  d.attribution_status=data.impression_id||data.page_view_id?'unmatched':'missing';
  if(d.page_view_id&&!data.impression_id)d.attribution_status='missing';
  if(d.page_view_id&&d.impression_id){
   const [imp]=await query("SELECT * FROM events WHERE event_id=? AND event_name='entry_impression' AND attribution_status='recorded'",[d.impression_id],db);
   if(imp&&context(imp,d)&&same(imp,d,['page_view_id','entry_id','placement_id','slot_id','creative_version','device'])&&instant(imp.received_at)<=instant(timing.received_at))d.attribution_status='matched';
  }
 }
 await write(d,db);
 if(d.impression_key){
  // Locking read sees the winner of a concurrent unique-key insert, even under REPEATABLE READ.
  const [stored]=await query('SELECT * FROM events WHERE impression_key=? LOCK IN SHARE MODE',[d.impression_key],db);
  if(!stored||!context(stored,d))throw new AppError(409,'曝光事件编号冲突');
  return {page_view_id:stored.page_view_id,impression_id:stored.impression_id,creative_version:stored.creative_version};
 }
 if(d.event_name==='page_view'){
  const [stored]=await query('SELECT * FROM events WHERE event_id=? LOCK IN SHARE MODE',[d.event_id],db);
  if(!stored||stored.event_name!=='page_view'||!context(stored,d))throw new AppError(409,'页面事件编号冲突');
  return {page_view_id:stored.page_view_id||stored.event_id};
 }
 return {};
}
