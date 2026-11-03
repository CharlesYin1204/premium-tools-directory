import {query,transaction,decode} from './db.js';
export async function claimSyncJob(id,token){return transaction(async db=>{
 await query("SELECT id FROM resources WHERE id='site' FOR UPDATE",[],db);
 const [r]=await query("SELECT *, (lease_until IS NULL OR lease_until<=UTC_TIMESTAMP()) expired FROM sync_jobs WHERE id=? FOR UPDATE",[id],db);
 if(!r||r.state!=='queued'&&!(r.state==='running'&&r.expired))return null;
 const [other]=await query("SELECT id FROM sync_jobs WHERE id<>? AND state='running' AND lease_until>UTC_TIMESTAMP() LIMIT 1",[id],db);if(other)return null;
 const cursor=decode(r.sync_cursor),counts=decode(r.counts)||{},recoveries=(cursor.recoveries||0)+(r.state==='running'?1:0);
 if(recoveries>3){await query("UPDATE sync_jobs SET state='failed',error_code='WORKER_RECOVERY_LIMIT',error_message='同一页连续中断超过恢复上限，请排查后手动恢复',lease_until=NULL,worker_token=NULL WHERE id=?",[id],db);return null;}
 cursor.recoveries=recoveries;cursor.stop_page??=cursor.next_page+Math.max(1,cursor.params.max_pages-(counts.pages||0)%cursor.params.max_pages);
 await query("UPDATE sync_jobs SET state='running',sync_cursor=?,worker_token=?,lease_until=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND) WHERE id=?",[JSON.stringify(cursor),token,id],db);
 return {...r,sync_cursor:cursor};
});}
export async function nextSyncJob(){const [job]=await query("SELECT id FROM sync_jobs WHERE state='queued' OR (state='running' AND (lease_until IS NULL OR lease_until<=UTC_TIMESTAMP())) ORDER BY created_at,id LIMIT 1");return job?.id;}
export async function syncWorkerStatus(){const [r]=await query("SELECT updated_at,TIMESTAMPDIFF(SECOND,updated_at,UTC_TIMESTAMP()) age FROM system_health WHERE name='sync_worker'");return {available:!!r&&r.age>=0&&r.age<45,last_seen:r?.updated_at||null};}
