import {updateSyncedResource} from './sync-content-write.js';
import {claimSyncJob} from './sync-queue.js';
import {randomUUID,createHash} from 'node:crypto';
import {query,transaction,decode} from './db.js';
import {AppError} from './security.js';
import {sourceConfig,sourceRequest} from './laosiji.js';
import {sourcePaths,sourceSystem,parseSearch,mapSource} from './laosiji-protocol.js';
export function syncParams(b){
 if(!['video','comic'].includes(b.type))throw new AppError(422,'请选择视频或漫画');
 const pageSize=Number(b.page_size??20),maxPages=Number(b.max_pages??1);
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>50||!Number.isInteger(maxPages)||maxPages<1||maxPages>20)throw new AppError(422,'每页1–50条，每次1–20页');
 const mode=b.mode||'import';if(!['import','withdrawn'].includes(mode)||mode==='withdrawn'&&b.type!=='video')throw new AppError(422,'下架同步仅支持视频');
 const out={type:b.type,mode,page_size:pageSize,max_pages:maxPages,position:b.type==='video'?'movie':undefined};
 for(const k of ['keywords','cat_id','task_id']){if(b[k]!=null&&(typeof b[k]!=='string'||b[k].length>100))throw new AppError(422,'搜索条件最多100字符');if(b[k])out[k]=b[k].trim();}
 if(mode==='withdrawn'){out.position='all';out.status=-1;}else if(b.type==='video'){if(typeof b.position!=='string'||!['movie','douyin','cartoon','guochan','bl','dark','all'].includes(b.position))throw new AppError(422,'请选择文档定义的资源分区');out.position=b.position;}
 for(const k of ['start_time','end_time']){if(b[k]){const s=String(b[k]).replace('T',' ');const normalized=s.length===16?s+':00':s;if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized))throw new AppError(422,'更新范围须为有效日期时间');const date=new Date(normalized.replace(' ','T')+'Z');if(!Number.isFinite(+date)||date.toISOString().slice(0,19).replace('T',' ')!==normalized)throw new AppError(422,'更新范围日期不存在');out[k]=normalized;}}
 if(!out.end_time)out.end_time=new Date(Date.now()+8*3600000).toISOString().slice(0,19).replace('T',' ');
 if(out.start_time&&out.end_time&&out.start_time>out.end_time)throw new AppError(422,'结束时间不能早于开始时间');
 return out;
}
export async function startSync(b,u){const c=await sourceConfig();if(!c.enabled||!c.appid||!c.appkey)throw new AppError(503,'正式文档已读取，请先配置并启用部门appid及appkey');if(c.check_status!=='ok')throw new AppError(409,'请先完成连接检查，再启动真实同步');
 return transaction(async db=>{await query("SELECT id FROM resources WHERE id='site' FOR UPDATE",[],db);const [active]=await query("SELECT id FROM sync_jobs WHERE state IN ('queued','running') AND (lease_until IS NULL OR lease_until>UTC_TIMESTAMP()) LIMIT 1",[],db);if(active)throw new AppError(409,'已有同步任务正在运行，请等待完成');
 if(b.action==='resume'){const [j]=await query('SELECT * FROM sync_jobs WHERE id=? FOR UPDATE',[String(b.id||'')],db);if(!j||!['failed','paused','running','queued'].includes(j.state)||['running','queued'].includes(j.state)&&j.lease_until&&new Date(j.lease_until+'Z')>new Date())throw new AppError(409,'当前任务不能恢复');const cursor=decode(j.sync_cursor);cursor.stop_page=cursor.next_page+cursor.params.max_pages;cursor.recoveries=0;if(cursor.config_version!==c.version)throw new AppError(409,'接入配置已改变，请创建新任务以免混用数据源');await query("UPDATE sync_jobs SET state='queued',sync_cursor=?,error_code=NULL,error_message=NULL,lease_until=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND),worker_token=NULL WHERE id=?",[JSON.stringify(cursor),j.id],db);await query('INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)',[u.username,'sync_resume',j.id,'{}'],db);return {id:j.id};}
 const input=syncParams(b);const id=randomUUID();const cursor={params:input,next_page:1,config_version:c.version,actor:u.username,stop_page:1+input.max_pages,recoveries:0};await query("INSERT INTO sync_jobs(id,type,state,sync_cursor,counts,lease_until) VALUES(?,?,'queued',?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND))",[id,input.type,JSON.stringify(cursor),JSON.stringify({requests:0,pages:0,created:0,updated:0,skipped:0,offline:0})],db);await query('INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)',[u.username,'sync_start',id,JSON.stringify({type:input.type,mode:input.mode,page_size:input.page_size,max_pages:input.max_pages})],db);return {id};});
}
export async function syncJobs(){return query("SELECT id,type,JSON_UNQUOTE(JSON_EXTRACT(sync_cursor,'$.params.mode')) AS mode,state,counts,error_code,error_message,created_at,updated_at,lease_until FROM sync_jobs ORDER BY created_at DESC LIMIT 100");}
export async function runSync(id){const token=randomUUID();let heartbeat,counts,cursor;
 try{const job=await claimSyncJob(id,token);if(!job)return;cursor=decode(job.sync_cursor);counts=decode(job.counts);const c=await sourceConfig();if(c.version!==cursor.config_version)throw new AppError(409,'接入配置已变化，请新建同步任务');c.onRequest=()=>{counts.requests++;};let leaseLost=false;heartbeat=setInterval(()=>{query("UPDATE sync_jobs SET lease_until=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND) WHERE id=? AND worker_token=? AND state='running'",[id,token]).then(r=>{if(!r.affectedRows)leaseLost=true;}).catch(()=>{leaseLost=true;});},20000);
 const p=cursor.params;for(let n=0;n<p.max_pages;n++){
  if(leaseLost)throw new AppError(409,'任务执行权已变化，请刷新查看状态');
  const {type,mode,max_pages,...filters}=p;const payload={...filters,page:cursor.next_page,need_total_info:'n'};if(type==='comic')payload.order='update_date';
  let items;try{items=parseSearch(await sourceRequest(c,type==='video'?sourcePaths.videoSearch:sourcePaths.comicSearch,payload),type);}catch(e){if(e.status)throw e;throw new AppError(502,'上游列表结构与文档不一致，已停止且保留当前页，请提供真实响应核对');}
  if(items.length>p.page_size)throw new AppError(502,'上游返回数量超出请求页大小，已停止推进页码');
  const details=[];if(mode==='withdrawn'){if(items.some(item=>String(item.status)!=='-1'))throw new AppError(502,'下架列表包含未确认下架的记录，当前页未写入');details.push(...items.map(source=>({source,mapped:null})));}
  for(let i=0;mode!=='withdrawn'&&i<items.length;i+=4){const batch=await Promise.allSettled(items.slice(i,i+4).map(async item=>{const data=await sourceRequest(c,type==='video'?sourcePaths.videoDetail:sourcePaths.comicDetail,{id:item.id});if(!data||data.id!==item.id)throw new AppError(502,'上游详情编号与列表不一致');let mapped;try{mapped=mapSource(type,data,c);}catch{throw new AppError(502,'上游详情字段与文档不一致，当前页未写入');}return {source:data,mapped};}));const failure=batch.find(r=>r.status==='rejected');if(failure)throw failure.reason;details.push(...batch.map(r=>r.value));}
  const signature=createHash('sha256').update(JSON.stringify(items.map(x=>x.id))).digest('hex');if(items.length&&cursor.last_page_signature===signature)throw new AppError(502,'上游重复返回上一页，已停止推进页码');
  const nextCounts={...counts,pages:counts.pages+1};const nextCursor={...cursor,next_page:cursor.next_page+1,last_page_signature:signature,recoveries:0};
  await transaction(async db=>{
   await query("SELECT id FROM resources WHERE id='site' FOR UPDATE",[],db);const [lock]=await query('SELECT state,worker_token FROM sync_jobs WHERE id=? FOR UPDATE',[id],db);if(lock?.state!=='running'||lock.worker_token!==token||leaseLost)throw new AppError(409,'任务已被其他进程接管，当前页未写入');const [current]=await query("SELECT version,config FROM integration_configs WHERE name='laosiji'",[],db);if(current?.version!==c.version||!decode(current.config).enabled)throw new AppError(409,'同步配置已变化或被关闭，当前页未写入');
   for(const {source,mapped} of details){const system=sourceSystem(type);const [previous]=await query('SELECT * FROM source_records WHERE source_system=? AND source_id=?',[system,source.id],db);const prior=previous?decode(previous.payload):null;const sourceTime=type==='comic'&&typeof source.last_update==='string'?source.last_update:'';
    if(sourceTime&&previous?.source_updated_at&&sourceTime<previous.source_updated_at){nextCounts.skipped++;continue;}
    const matches=previous?await query('SELECT * FROM resources WHERE id=? FOR UPDATE',[previous.resource_id],db):await query("SELECT * FROM resources WHERE kind='contents' AND ((JSON_UNQUOTE(JSON_EXTRACT(draft,'$.source_system'))=? AND JSON_UNQUOTE(JSON_EXTRACT(draft,'$.source_id'))=?) OR (JSON_UNQUOTE(JSON_EXTRACT(published,'$.source_system'))=? AND JSON_UNQUOTE(JSON_EXTRACT(published,'$.source_id'))=?)) FOR UPDATE",[system,source.id,system,source.id],db);if(matches.length>1)throw new AppError(409,'存在重复来源记录，请先合并再重试');const [existing]=matches;
    if(mode==='withdrawn'){
     if(!existing){nextCounts.skipped++;continue;}
     await query("UPDATE resources SET published=NULL,status='offline',version=version+1 WHERE id=?",[existing.id],db);
     await query('INSERT INTO source_records(source_system,source_id,resource_id,source_updated_at,payload) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE resource_id=VALUES(resource_id),payload=VALUES(payload)',[system,source.id,existing.id,previous?.source_updated_at||'',JSON.stringify({...prior,source:prior?.source||source,withdrawal:source,available:false,batch_id:id,observed_at:new Date().toISOString()})],db);
     nextCounts.updated++;if(existing.published)nextCounts.offline++;continue;
    }
    const resourceId=existing?.id||randomUUID();const available=type!=='video'||String(source.status)!=='-1';
    if(existing){const update=await updateSyncedResource(existing,mapped,prior?.mapped,available,db);nextCounts.updated++;if(update.wentOffline)nextCounts.offline++;
    }else{const slug='lsj-'+type+'-'+createHash('sha256').update(source.id).digest('hex').slice(0,24);await query("INSERT INTO resources(id,kind,slug,draft,status,is_demo) VALUES(?,'contents',?,?,'candidate',0)",[resourceId,slug,JSON.stringify({...mapped,slug})],db);nextCounts.created++;}
    await query('INSERT INTO source_records(source_system,source_id,resource_id,source_updated_at,payload) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE resource_id=VALUES(resource_id),source_updated_at=VALUES(source_updated_at),payload=VALUES(payload)',[system,source.id,resourceId,sourceTime,JSON.stringify({source,mapped,available,batch_id:id,observed_at:new Date().toISOString()})],db);
   }
   const state=items.length<p.page_size?'completed':nextCursor.next_page>=cursor.stop_page?'paused':'running';await query("UPDATE sync_jobs SET state=?,sync_cursor=?,counts=?,lease_until=IF(?='running',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 SECOND),NULL),error_code=NULL,error_message=NULL WHERE id=? AND worker_token=?",[state,JSON.stringify(nextCursor),JSON.stringify(nextCounts),state,id,token],db);await query('INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)',[cursor.actor,'sync_page',id,JSON.stringify({page:cursor.next_page,state,counts:nextCounts})],db);
  });counts=nextCounts;cursor=nextCursor;if(items.length<p.page_size||cursor.next_page>=cursor.stop_page)break;
 }
 }catch(e){try{await query("UPDATE sync_jobs SET state='failed',counts=COALESCE(?,counts),error_code=?,error_message=?,lease_until=NULL WHERE id=? AND worker_token=?",[counts?JSON.stringify(counts):null,String(e.sourceCode||e.status||'SYNC_ERROR'),e instanceof AppError?e.message:'同步失败，当前页未推进，请重试并核对来源数据',id,token]);}catch{console.error('Source job status unavailable');}}finally{clearInterval(heartbeat);}
}
