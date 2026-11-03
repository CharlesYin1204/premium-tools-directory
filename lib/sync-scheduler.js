import {randomUUID} from 'node:crypto';import {query,transaction,decode} from './db.js';import {sourceConfig} from './laosiji.js';import {AppError} from './security.js';import {scheduleConfig,scheduleWindow,sameScheduleParams} from './sync-schedule-rules.js';
const ready=c=>c.enabled&&c.appid&&c.appkey&&c.check_status==='ok';
export async function syncSchedules(){return (await query('SELECT * FROM sync_schedules ORDER BY id')).map(r=>({...r,enabled:!!r.enabled,config:decode(r.config)}));}
export async function saveSyncSchedule(input,user){
 if(!['super','operator'].includes(user.role))throw new AppError(403,'仅同步管理员可修改调度');
 if(input.reset_cursor!==undefined&&typeof input.reset_cursor!=='boolean')throw new AppError(422,'重置游标参数无效');const config=scheduleConfig(input.config),id=config.params.type+'-'+config.params.mode,c=config.enabled?await sourceConfig():null;
 if(config.enabled&&!ready(c))throw new AppError(503,'启用调度前须配置真实业务凭据并通过连接检查');
 if(!Number.isInteger(input.version)||input.version<0)throw new AppError(422,'调度版本无效');
 return transaction(async db=>{await query("SELECT id FROM resources WHERE id='site' FOR UPDATE",[],db);const [old]=await query('SELECT * FROM sync_schedules WHERE id=? FOR UPDATE',[id],db);if((old?.version||0)!==input.version)throw new AppError(409,'调度已被修改，请刷新后合并');
  const [current]=await query("SELECT version,check_status,config FROM integration_configs WHERE name='laosiji'",[],db);if(config.enabled&&(current?.version!==c.version||current?.check_status!=='ok'||!decode(current.config).enabled))throw new AppError(409,'业务接入状态已变化，请重新检查');
  if(old?.last_job_id){const [job]=await query('SELECT state FROM sync_jobs WHERE id=?',[old.last_job_id],db);if(input.reset_cursor&&job&&['queued','running'].includes(job.state))throw new AppError(409,'运行或排队中的任务不能重置增量');if(!input.reset_cursor&&job&&['queued','running','paused','failed'].includes(job.state)&&!sameScheduleParams(decode(old.config).params,config.params))throw new AppError(409,'上一批未完成，不能更换读取条件；请先处理该任务');}
  const changed=!!input.reset_cursor||old&&!sameScheduleParams(decode(old.config).params,config.params);
  await query('INSERT INTO sync_schedules(id,config,enabled,next_run_at) VALUES(?,?,?,IF(?,UTC_TIMESTAMP(),NULL)) ON DUPLICATE KEY UPDATE config=VALUES(config),enabled=VALUES(enabled),version=version+1,next_run_at=VALUES(next_run_at),watermark=IF(?,NULL,watermark),last_job_id=IF(?,NULL,last_job_id),last_error=NULL',[id,JSON.stringify(config),config.enabled,config.enabled,!!changed,!!changed],db);
  await query('INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)',[user.username,'sync_schedule_save',id,JSON.stringify({version:input.version+1,config,reset_cursor:!!input.reset_cursor})],db);return {id,version:input.version+1};
 });
}
// All due selection, previous-job inspection and enqueue operations share one transaction.
export async function enqueueDueSchedule(){
 const [due]=await query('SELECT id FROM sync_schedules WHERE enabled=1 AND next_run_at<=UTC_TIMESTAMP() ORDER BY next_run_at,id LIMIT 1');if(!due)return null;const c=await sourceConfig();
 return transaction(async db=>{await query("SELECT id FROM resources WHERE id='site' FOR UPDATE",[],db);const [s]=await query('SELECT * FROM sync_schedules WHERE id=? AND enabled=1 AND next_run_at<=UTC_TIMESTAMP() FOR UPDATE',[due.id],db);if(!s)return null;const config=decode(s.config);
  const postpone=async message=>{await query('UPDATE sync_schedules SET last_error=?,next_run_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE) WHERE id=?',[message,config.interval_minutes,s.id],db);return null;};
  const [current]=await query("SELECT version,check_status,config FROM integration_configs WHERE name='laosiji'",[],db);if(!ready(c)||current?.version!==c.version||current?.check_status!=='ok'||!decode(current.config).enabled)return postpone('业务接入未启用、未验证或配置已变化；未创建任务');
  let watermark=s.watermark,previous,cursor;
  if(s.last_job_id){[previous]=await query('SELECT state,sync_cursor FROM sync_jobs WHERE id=?',[s.last_job_id],db);if(!previous||!['completed','paused'].includes(previous.state))return postpone('上一批未完成或失败，等待执行或人工排障；增量水位未推进');cursor=decode(previous.sync_cursor);if(!sameScheduleParams(cursor.params,config.params))return postpone('读取条件已变化，请核对后重置增量');}
  const [active]=await query("SELECT id FROM sync_jobs WHERE state IN ('queued','running') LIMIT 1",[],db);if(active)return postpone('已有同步任务待执行或运行，等待串行处理');
  if(previous?.state==='paused'){
   if(cursor.config_version!==c.version)return postpone('接入配置已变化，请核对后重置增量');
   cursor.stop_page=cursor.next_page+config.params.max_pages;cursor.recoveries=0;
   await query("UPDATE sync_jobs SET state='queued',sync_cursor=?,worker_token=NULL,lease_until=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND) WHERE id=? AND state='paused'",[JSON.stringify(cursor),s.last_job_id],db);
   await query('UPDATE sync_schedules SET last_error=NULL,next_run_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE) WHERE id=?',[config.interval_minutes,s.id],db);
   await query('INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)',['sync-scheduler','sync_schedule_continue',s.last_job_id,JSON.stringify({schedule_id:s.id,next_page:cursor.next_page})],db);return s.last_job_id;
  }
  if(previous?.state==='completed')watermark=cursor.params.end_time;
  let params;try{params=scheduleWindow(config,watermark);}catch{return postpone('增量水位或调度配置异常，未创建任务');}
  const id=randomUUID(),newCursor={params,next_page:1,stop_page:params.max_pages+1,recoveries:0,config_version:c.version,actor:'sync-scheduler',schedule_id:s.id,schedule_version:s.version};
  await query("INSERT INTO sync_jobs(id,type,state,sync_cursor,counts,lease_until) VALUES(?,?,'queued',?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND))",[id,params.type,JSON.stringify(newCursor),JSON.stringify({requests:0,pages:0,created:0,updated:0,skipped:0,offline:0})],db);
  await query('UPDATE sync_schedules SET last_job_id=?,watermark=?,last_error=NULL,next_run_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE) WHERE id=?',[id,watermark,config.interval_minutes,s.id],db);
  await query('INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)',['sync-scheduler','sync_schedule_enqueue',id,JSON.stringify({schedule_id:s.id,schedule_version:s.version,params})],db);return id;
 });
}
