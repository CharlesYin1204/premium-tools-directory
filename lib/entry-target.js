import {targetSelection} from './entry-platform.js';
export async function entryTarget(entry,useBackup,validate,platform='unknown'){
 if(useBackup&&!entry.backup_url)return {status:410,message:'此入口暂未提供备用地址'};
 const selection=targetSelection(entry,platform,useBackup);
 try{return {...selection,url:await validate(selection.url)};}
 catch{
  let backupHost;
  if(!useBackup&&entry.backup_url){try{backupHost=new URL(await validate(entry.backup_url)).hostname;}catch{}}
  return {status:503,message:useBackup?'备用地址暂不可用，请返回导航':'主地址暂不可用，请稍后重试',backupHost};
 }
}
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function backupPath(id,params){
 const next=new URLSearchParams({backup:'1'});
 for(const key of ['page','placement','content','session_id','device','channel','test','creative_version','page_view_id','impression_id']){const value=params.get(key);if(value&&value.length<=200)next.set(key,value);}
 return '/go/'+encodeURIComponent(id)+'?'+next;
}
