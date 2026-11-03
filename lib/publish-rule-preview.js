import {createHash} from 'node:crypto';import {contentMissing} from './content-readiness.js';
export function publishRuleConfig(value){
 const fail=message=>{throw Object.assign(new Error(message),{status:422});};
 if(!value||!['video','comic'].includes(value.type))fail('请选择视频或漫画');
 if(value.enabled!==undefined&&value.enabled!==false)throw Object.assign(new Error('自动发布尚未接通可信上游审核、授权与媒体契约；当前只能保存关闭状态的规则草稿'),{status:409});
 const config={type:value.type,enabled:false,max_publish:Number(value.max_publish)};
 if(!Number.isInteger(config.max_publish)||config.max_publish<1||config.max_publish>100)fail('每批拟纳入数量须为1–100；这是本站保护范围，不代表上游限额');
 for(const key of ['include_tags','exclude_tags']){if(!Array.isArray(value[key])||value[key].length>20||value[key].some(x=>typeof x!=='string'||!x.trim()||x.trim().length>60))fail('标签最多20项，每项1–60字');config[key]=[...new Set(value[key].map(x=>x.trim()))].sort();}
 return config;
}
export function publishRulePreview(config,resources,sources,published){
 const system='laosiji-'+config.type,site=published.find(r=>r.kind==='settings'),sourceMap=new Map(sources.map(s=>[s.source_system+'\0'+s.source_id,s]));
 const candidates=resources.filter(r=>r.kind==='contents'&&r.type===config.type&&r.source_system===system).sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))||a.id.localeCompare(b.id));
 let selected=0;const rows=candidates.map(r=>{const source=sourceMap.get(system+'\0'+r.source_id),tags=Array.isArray(r.tags)?r.tags:[],reasons=[];
  if(r.is_demo)reasons.push('演示内容不进入自动发布');if(r.manual_excluded)reasons.push('已人工排除');if(r.revoked)reasons.push('来源已撤权');
  if(!source||source.resource_id!==r.id||source.payload?.available!==true)reasons.push('可信来源可用状态未确认');
  if(!site?.content_release_approved||!site?.approval_note)reasons.push('站点内容发布条件未确认');
  reasons.push(...contentMissing(r,published).map(x=>'缺少或无效：'+x));
  const matches=(!config.include_tags.length||config.include_tags.some(t=>tags.includes(t)))&&!config.exclude_tags.some(t=>tags.includes(t));
  let result;if(r.has_published)result=matches?'已发布，保持':'已发布未命中，保留并复核';else if(reasons.length)result='资料或资格阻塞';else if(!matches)result='未命中标签规则';else if(selected>=config.max_publish)result='超出本批上限';else{result='拟纳入，等待最终审核';selected++;}
  return {id:r.id,title:r.title,source_id:r.source_id,version:r.version,has_published:r.has_published,matches,result,reasons:[...new Set(reasons)],tags};
 });
 const snapshot=createHash('sha256').update(JSON.stringify({config,resources,sources,published})).digest('hex');
 return {config,snapshot,generated_at:new Date().toISOString(),total:rows.length,matched:rows.filter(r=>r.matches).length,selected,blocked:rows.filter(r=>r.reasons.length).length,existing_review:rows.filter(r=>r.has_published&&!r.matches).length,automatic_publish_enabled:false,gate:'尚无可信上游审核/授权及媒体签发契约；拟纳入不等于可上线，发布时仍须完整资格与媒体校验。',rows};
}
