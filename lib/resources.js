import {ensureContentHistory,recordContentHistory,restoredContent} from './content-history.js';
import {appMetadataError,appMetadataUrls,applyAppDownloads} from './app-entry.js';
import {isLocalContentTarget} from './local-content-target.js';
import {adActionNeedsReason,adReasonError,adActionSnapshot} from './ad-action.js';
import {inspectAdMaterial} from './ad-material.js';
import {syncedContent,changedSourceField} from './synced-content.js';
import {adCapacity,adTemplate,adEligible,adSlotId} from './ad-slots.js';
import {validParent,visibleCategories} from './category-tree.js';
import {configError,configDefaults,localLink} from './site-config.js';
import {after} from 'next/server.js';
import {createPromotionCache,promotionCacheSeconds} from './promotion-cache.js';
import {entryConflict} from './entry-conflict.js';
import {defaultHomeModules,homeModuleError} from './home-modules.js';
import {randomUUID} from 'node:crypto';
import {query,transaction,decode} from './db.js';
import {AppError,safeUrl} from './security.js';
import {checkContent} from './media.js';
import {fields,kinds,locations} from './catalog.js';
import {placementTime,placementConflictDetails,placementConflictMessage} from './placement-rules.js';
export function resource(r,published=false){const live=decode(r.published);return {...decode(published?r.published:r.draft),id:r.id,kind:r.kind,status:r.status,version:r.version,published_at:r.published_at,updated_at:r.updated_at,has_published:!!r.published,revoked:!!r.revoked,is_demo:!!r.is_demo,manual_excluded:!!r.manual_excluded,...(r.kind==='placements'?{live_ad:adActionSnapshot(live),published_paused:!!live?.paused,live_schedule:live?{start_at:live.start_at,end_at:live.end_at}:null}:{} )};}
export async function allRows(db){return query('SELECT * FROM resources ORDER BY created_at DESC,id',[],db);}
export function publicData(rows,at=Date.now()){const raw=rows.filter(r=>r.published&&!r.revoked&&!r.manual_excluded).map(r=>resource(r,true));const companies=raw.filter(r=>r.kind==='companies');const companyIds=new Set(companies.map(x=>x.id));const categories=raw.filter(r=>r.kind==='categories');const liveCats=visibleCategories(categories);const cats=new Set(liveCats.map(x=>x.id));const valid=r=>(r.kind==='contents'&&r.type==='video'||r.kind==='entries'&&!r.company_id||companyIds.has(r.company_id))&&(r.category_ids||[]).some(id=>cats.has(id));const entries=raw.filter(r=>r.kind==='entries'&&valid(r));const contentApproved=raw.find(r=>r.kind==='settings')?.content_release_approved;const contents=raw.filter(r=>contentApproved&&r.kind==='contents'&&valid(r)&&r.rights_status==='approved');const eids=new Set(entries.map(e=>e.id));const cids=new Set(contents.map(c=>c.id));const now=at;const placements=raw.filter(r=>r.kind==='placements'&&adEligible(r,{at})&&eids.has(r.entry_id)&&(!r.category_id||cats.has(r.category_id))&&(!r.content_id||cids.has(r.content_id))&&(!r.start_at||new Date(r.start_at+'+08:00').getTime()<=now)&&(!r.end_at||new Date(r.end_at+'+08:00').getTime()>now));const sort=a=>a.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||String(b.published_at).localeCompare(String(a.published_at))||a.id.localeCompare(b.id));return {companies:sort(companies),categories:sort(liveCats),entries:sort(entries),contents:sort(contents),placements:sort(placements).sort((a,b)=>(b.priority||0)-(a.priority||0)),site:raw.find(x=>x.kind==='settings')||{name:'精品工具导航站'}};}
export function placementPreview(d,rows,at=Date.now()){
 const data=publicData(rows,at),entry=data.entries.find(e=>e.id===d.entry_id)||null;
 const category=data.categories.find(c=>c.id===d.category_id),content=data.contents.find(c=>c.id===d.content_id);
 const warnings=[];
 if(!entry)warnings.push('关联站点入口未发布或其渠道、分类不可用，前台不会展示。');
 if(d.category_id&&!category||d.location==='category'&&!category)warnings.push('限定分类不可用。');
 if(d.content_id&&!content||d.location==='detail'&&!content)warnings.push('限定内容不可用。');
 if(!locations[d.location])warnings.push('广告位置无效。');if(d.paused)warnings.push('该广告已暂停，前台不展示。');if(adTemplate(d)==='banner')for(const device of d.device==='all'?['pc','h5']:[d.device])if(!d[device+'_image_url'])warnings.push(device.toUpperCase()+'素材未配置，该端不展示。');
 if(!['all','pc','h5'].includes(d.device))warnings.push('展示设备无效。');
 const start=d.start_at?new Date(d.start_at+'+08:00').getTime():null,end=d.end_at?new Date(d.end_at+'+08:00').getTime():null;
 if(start!==null&&!Number.isFinite(start)||end!==null&&!Number.isFinite(end)||start!==null&&end!==null&&end<=start)warnings.push('有效期配置无效。');
 else if(start!==null&&start>at)warnings.push('尚未到开始时间。');
 else if(end!==null&&end<=at)warnings.push('推广已到期。');
 const peers=rows.filter(r=>r.id!==d.id&&r.kind==='placements'&&r.published&&!r.revoked&&!r.manual_excluded).map(r=>resource(r,true));
 const conflict=placementConflictDetails(d,peers,adCapacity(d));if(conflict)warnings.push(placementConflictMessage(conflict));
 return {placement_conflict:conflict,entry,company:entry?data.companies.find(c=>c.id===entry.company_id)?.name:null,category:category?.name,content:content?.title,site:{name:data.site.name,logo_url:data.site.logo_url},warnings,checked_at:new Date(at).toISOString()};
}
const promotionCache=globalThis.__bdPromotionCache||(globalThis.__bdPromotionCache=createPromotionCache());
function promotionHealth(state){const previous=globalThis.__bdPromotionHealth;if(previous===state)return;globalThis.__bdPromotionHealth=state;if(state==='fresh'&&!previous)return;try{after(async()=>{try{if(state==='fresh')await query("DELETE FROM system_health WHERE name='promotion_config'");else await query("INSERT INTO system_health(name,message) VALUES('promotion_config',?) ON DUPLICATE KEY UPDATE message=VALUES(message)",[state==='cached'?'推广配置暂时无法读取，正在使用期限内的最近成功配置':'推广配置暂时无法读取且无有效缓存，推广已隐藏，导航主体继续显示']);}catch{console.error('Promotion configuration health record unavailable');}});}catch{console.error('Promotion configuration state:',state);}}
export async function getPublic(){
 const core=await query("SELECT * FROM resources WHERE kind<>'placements' ORDER BY created_at DESC,id");
 const promotions=await promotionCache.read(()=>query("SELECT id,kind,published,status,version,revoked,is_demo,published_at,updated_at FROM resources WHERE kind='placements' ORDER BY created_at DESC,id"),promotionCacheSeconds(process.env.PROMOTION_CACHE_SECONDS));
 promotionHealth(promotions.state);
 return publicData([...core,...promotions.rows]);
}
export async function audit(db,u,action,id,detail={}){await query('INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)',[u.username,action,id,JSON.stringify(detail)],db);}
function err(key,message){throw new AppError(422,'请检查输入项',{[key]:message});}
export async function validate(kind,d,rows,id,publish=false){
 if(!kinds.includes(kind))throw new AppError(404,'资源类型不存在');
 for(const [k,,type,required] of fields[kind]){if(required&&!(kind==='entries'&&!publish&&['company_id','category_ids','target_url'].includes(k))&&!(kind==='contents'&&d.type==='video'&&k==='company_id')&&(!d[k]||Array.isArray(d[k])&&!d[k].length))err(k,'此项为必填项');if(['text','textarea','url','email','date','datetime-local'].includes(type)&&d[k]!=null&&typeof d[k]!=='string')err(k,'格式不正确');}
 const name=d.name||d.title;const maxName=kind==='categories'?40:['entries','companies'].includes(kind)?60:kind==='contents'&&d.type==='video'?500:100;if(typeof name!=='string'||name.length<2||name.length>maxName)err(d.title?'title':'name','请输入 2–'+maxName+' 个字符');
 if(kind!=='settings'&&(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(d.slug||'')))err('slug','使用小写英文、数字和短横线，最多 80 位');
 if(d.description?.length>200)err('description','简介最多 200 字');
 for(const key of ['aliases','tags','category_ids','entry_ids'])if(d[key]!==undefined&&(!Array.isArray(d[key])||d[key].some(x=>typeof x!=='string')||new Set(d[key]).size!==d[key].length))err(key,'必须是没有重复项的列表');
 if(d.tags?.length>10||d.aliases?.length>10)err('tags','标签和别名最多各 10 个');
 if(d.sort_order!==undefined&&!Number.isInteger(Number(d.sort_order)))err('sort_order','请输入整数');
 if(rows.some(r=>r.id!==id&&r.kind===kind&&(decode(r.draft).slug===d.slug||decode(r.published)?.slug===d.slug)))throw new AppError(409,'此标识已被其他草稿或线上版本占用');
 const find=(id,k)=>rows.find(x=>x.id===id&&x.kind===k);const pub=publicData(rows);
 if(['entries','contents'].includes(kind)){
  if(!(kind==='contents'&&d.type==='video')&&!(kind==='entries'&&!d.company_id)&&!find(d.company_id,'companies'))err('company_id','请选择已有渠道');if((publish||kind!=='entries')&&!d.category_ids?.length||d.category_ids?.length>3||d.category_ids?.some(x=>!find(x,'categories')))err('category_ids','请选择 1–3 个有效分类');
  if(publish&&(!(kind==='contents'&&d.type==='video')&&!(kind==='entries'&&!d.company_id)&&!pub.companies.some(x=>x.id===d.company_id)||d.category_ids.some(x=>!pub.categories.some(c=>c.id===x))))err('company_id','所属渠道和全部分类必须先发布');
 }
 if(kind==='categories'&&d.parent_id){const parent=find(d.parent_id,'categories');const tree=rows.filter(r=>r.kind==='categories').map(r=>({id:r.id,...decode(publish?r.published||r.draft:r.draft)}));if(!parent||!validParent(id,d.parent_id,tree))err('parent_id','请选择有效上级分类，不能选择自身或下级分类');if(publish&&!pub.categories.some(c=>c.id===d.parent_id))err('parent_id','上级分类必须先发布');}
 if(kind==='entries'){
  if(d.entry_kind&&!['website','app'].includes(d.entry_kind))err('entry_kind','管理模块无效');
  const appError=appMetadataError(d.app_meta);if(appError)err('app_meta',appError);
  for(const url of appMetadataUrls(d.app_meta))await safeUrl(url,'app_meta');
  if(d.action_mode&&!['visit','download'].includes(d.action_mode))err('action_mode','请选择直接访问或按终端下载');
  if(d.target_url||publish)await safeUrl(d.target_url);if(publish&&isLocalContentTarget(d.target_url)&&!['/videos','/comics'].includes(d.target_url)&&!pub.contents.some(c=>'/'+c.type+'/'+c.slug===d.target_url))err('target_url','站内目标内容必须先发布');for(const key of ['android_url','ios_url'])if(d[key])await safeUrl(d[key],key);if(d.backup_url)await safeUrl(d.backup_url,'backup_url');
  const conflict=entryConflict(d,rows.filter(r=>r.kind==='entries'&&r.id!==id).flatMap(r=>[decode(r.draft),decode(r.published)]));if(conflict)throw new AppError(409,'已存在相同目标网址或同公司同名站点',{[conflict]:conflict==='target_url'?'该目标网址已被其他草稿或线上版本使用':'同公司已有相同名称的草稿或线上站点'});
 }
 for(const key of ['icon_url','logo_url','cover_url','play_url'])if(d[key])await safeUrl(d[key],key);
 if(kind==='contents'){
  if(d.video_type&&!['movie','series','episode','short_drama'].includes(d.video_type))err('video_type','影片类型无效');
  for(const key of ['original_title','director','actors','region','language','source_site_id','source_site_name'])if(d[key]&&d[key].length>500)err(key,'最多 500 字');
  if(d.release_date&&(!/^\d{4}-\d{2}-\d{2}$/.test(d.release_date)||Number.isNaN(Date.parse(d.release_date))||new Date(d.release_date).toISOString().slice(0,10)!==d.release_date))err('release_date','上映日期无效');
  if(d.duration_seconds!==''&&d.duration_seconds!=null&&(!Number.isInteger(Number(d.duration_seconds))||Number(d.duration_seconds)<0))err('duration_seconds','时长须为非负整数');
  if(d.rating!==''&&d.rating!=null&&(!Number.isFinite(Number(d.rating))||Number(d.rating)<0||Number(d.rating)>10))err('rating','评分须在 0–10 之间');
  if(d.media_format&&!['auto','file','hls'].includes(d.media_format))err('media_format','视频格式无效');
  const source=typeof d.source_system==='string'?d.source_system.trim():'',sourceId=typeof d.source_id==='string'?d.source_id.trim():'';
  if(publish){for(const [key,label] of [['source_system','来源系统'],['source_id','来源编号'],['brand','品牌归属'],['rights_note','授权依据']])if(!(key==='brand'&&d.type==='video')&&(typeof d[key]!=='string'||!d[key].trim()))err(key,'发布前请补充'+label);}
  if(source&&sourceId&&rows.some(r=>r.kind==='contents'&&r.id!==id&&[decode(r.draft),decode(r.published)].some(v=>v&&typeof v.source_system==='string'&&typeof v.source_id==='string'&&v.source_system.trim()===source&&v.source_id.trim()===sourceId)))throw new AppError(409,'该来源系统和来源编号已存在，请编辑原内容',{source_id:'同一来源记录不能重复建档'});
  if(!Array.isArray(d.chapters))err('chapters','章节必须为 JSON 数组');
  if(!['video','comic'].includes(d.type))err('type','请选择视频或漫画');
  if(!['unknown','approved','revoked'].includes(d.rights_status))err('rights_status','授权状态无效');
  if(d.entry_ids?.some(id=>!find(id,'entries')))err('entry_ids','关联入口不存在');
  if(d.type==='comic'&&d.chapters?.length){if(!Array.isArray(d.chapters)||d.chapters.length>200)err('chapters','章节格式不正确或超过 200 章');for(const c of d.chapters){if(typeof c.title!=='string'||!Array.isArray(c.pages)||!c.pages.length||c.pages.length>500)err('chapters','每章需要标题和非空 pages 图片地址数组');for(const p of c.pages)await safeUrl(p,'chapters');}}
  if(publish){if(!pub.site.content_release_approved||!pub.site.approval_note)err('rights_status','站点内容发布条件尚未确认，请先在站点设置中填写书面确认记录');if(d.rights_status!=='approved'||!d.rights_note||d.type!=='video'&&!d.brand)err('rights_status','发布需要明确授权依据；漫画还需品牌归属');if(!d.cover_url)err('cover_url','发布需要封面');if(d.type==='video'&&!d.play_url)err('play_url','发布需要播放地址');if(d.type==='comic'&&!d.chapters?.length)err('chapters','发布需要完整章节与图片');if(d.entry_ids?.some(id=>!pub.entries.some(e=>e.id===id)))err('entry_ids','关联产品必须先发布');}
 }
 if(kind==='placements'){
  const template=adTemplate(d);if(d.image_fit&&!['contain','cover'].includes(d.image_fit))err('image_fit','请选择完整展示或居中裁切');if(d.crop_verified!==undefined&&d.crop_verified!==''&&typeof d.crop_verified!=='boolean')err('crop_verified','裁切确认须为布尔值');if(!locations[d.location]?.templates.includes(template))err('template','此位置不支持该模板');
  if(d.ad_type&&!['internal','external'].includes(d.ad_type))err('ad_type','请选择内部推广或外部合作');
  if(locations[d.location]?.devices&&!locations[d.location].devices.includes(d.device))err('device','此位置仅支持移动端');
  if(d.priority!==undefined&&d.priority!==''&&(!Number.isInteger(d.priority)||d.priority<0||d.priority>100))err('priority','优先级为0–100整数');
  for(const [key,max] of [['title',40],['description',80],['cta',12]])if(d[key]&&(typeof d[key]!=='string'||d[key].length>max||!d[key].trim()||key==='cta'&&d[key].length<2))err(key,'请检查文案长度（标题40字、说明80字、按钮2–12字）');
  for(const key of ['pc_image_url','h5_image_url'])if(d[key]){try{await safeUrl(d[key],'cover_url');}catch{err(key,'请输入可访问的公共图片地址或已上传图片');}}
  if(template==='banner'&&publish)for(const device of d.device==='all'?['pc','h5']:[d.device]){const key=device+'_image_url';if(!d[key])err(key,'发布横幅需要此终端的真实素材');await inspectAdMaterial(d[key],d,device);}
  if(template==='card'&&publish)for(const device of d.device==='all'?['pc','h5']:[d.device])if(d[device+'_image_url'])await inspectAdMaterial(d[device+'_image_url'],d,device);
  if(!locations[d.location])err('location','请选择系统预置位置');if(!['all','pc','h5'].includes(d.device))err('device','设备范围无效');if(!find(d.entry_id,'entries'))err('entry_id','请选择有效站点');
  if(d.location==='category'&&!find(d.category_id,'categories'))err('category_id','分类推荐必须限定分类');if(d.location==='detail'&&!find(d.content_id,'contents'))err('content_id','详情推荐必须限定内容');
  for(const k of ['start_at','end_at'])if(d[k]&&!Number.isFinite(placementTime(d[k])))err(k,'请输入有效时间');if(d.start_at&&d.end_at&&d.start_at>=d.end_at)err('end_at','结束时间必须晚于开始时间');
  if(publish){if(!pub.entries.some(x=>x.id===d.entry_id))err('entry_id','目标站点必须先发布');if(d.category_id&&!pub.categories.some(c=>c.id===d.category_id))err('category_id','限定分类必须先发布');if(d.content_id&&!pub.contents.some(c=>c.id===d.content_id))err('content_id','限定内容必须先发布');const peers=rows.filter(r=>r.id!==id&&r.kind==='placements'&&r.published&&!r.revoked&&!r.manual_excluded).map(r=>resource(r,true));const conflict=placementConflictDetails(d,peers,adCapacity(d));if(conflict){const message=placementConflictMessage(conflict);throw Object.assign(new AppError(422,message,{[{template:'template',duplicate:'entry_id',capacity:'location'}[conflict.type]]:message}),{placement_conflict:conflict});}}
 }
 if(kind==='entries'&&d.landing_mode&&!['inherit','landing','direct'].includes(d.landing_mode))err('landing_mode','请选择跟随全站、开启落地页或直接跳转');
 if(kind==='settings'){const problem=configError(d);if(problem)err(problem.key,problem.message);if(d.portal){for(const key of ['engines','announcements','news','friends'])for(const item of d.portal[key])if(!localLink(item.url))await safeUrl(item.url.replace('{query}','demo'),'portal');if(!localLink(d.portal.submit_url))await safeUrl(d.portal.submit_url,'portal');}for(const link of d.return_home?.links||[]){try{await safeUrl(link.url,'return_home');}catch{err('return_home','回家路口仅支持安全可解析的公网HTTPS地址');}}for(const key of ['navigation','footer_navigation'])for(const item of Array.isArray(d[key])?d[key]:[]){if(!localLink(item.href))await safeUrl(item.href,key);}for(const c of Array.isArray(d.support_channels)?d.support_channels:[]){if(c.value&&!['email','phone'].includes(c.type)){await safeUrl(c.value,'support_channels');if(!c.value.startsWith('https://'))err('support_channels','社交客服请使用 HTTPS 链接');}if(c.qr_url)await safeUrl(c.qr_url,'cover_url');}if(d.home_modules!==undefined&&d.home_modules!==''){const message=homeModuleError(d.home_modules);if(message)err('home_modules',message);}if(d.seo_title?.length>120)err('seo_title','SEO 标题最多 120 个字符');if(d.video_seconds<1||d.video_seconds>3600)err('video_seconds','请输入 1–3600 秒');if(d.content_release_approved&&!d.approval_note)err('approval_note','请填写确认依据');if(d.contact_email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.contact_email))err('contact_email','邮箱格式不正确');}
}
export async function mutate(kind,input,u){if(kind==='contents')await ensureContentHistory();promotionCache.invalidate();try{return await transaction(async db=>{
 await query("SELECT id FROM resources WHERE id='site' FOR UPDATE",[],db);
 const rows=await allRows(db),old=rows.find(x=>x.id===input.id&&x.kind===kind);const action=input.action||'save';
 if(input.id&&!old)throw new AppError(404,'资源不存在');if(old&&old.version!==input.version)throw new AppError(409,'内容已被其他人修改，请刷新后合并');
 const id=old?.id||randomUUID();let d=old?decode(old.draft):{};
 const adOperation=kind==='placements'&&adActionNeedsReason(action);
 if(adOperation){if(!['super','operator'].includes(u.role))throw new AppError(403,'当前账号没有发布权限');const problem=adReasonError(input.reason);if(problem)err('reason',problem);}
 if(action==='save'||action==='restore_draft'){
  if(action==='restore_draft'){if(kind!=='contents'||!old)throw new AppError(400,'只能恢复已有内容');if(syncedContent(d))throw new AppError(409,'受管来源内容请在来源系统修改后重新同步');const [history]=await query('SELECT payload FROM content_history WHERE resource_id=? AND version=?',[id,Number(input.history_version)||0],db);if(!history)throw new AppError(404,'内容版本不存在');input={...input,data:restoredContent(decode(history.payload),d)};}
  d=Object.fromEntries((fields[kind]||[]).map(([key])=>[key,input.data?.[key]??d[key]??'']));
  if(kind==='settings'&&u.role!=='super')throw new AppError(403,'仅超级管理员可修改系统设置');
  if(kind==='settings'){if(!d.home_modules)d.home_modules=defaultHomeModules();for(const [key,value] of Object.entries(configDefaults()))if(d[key]===''||d[key]===undefined)d[key]=value;}
  if(kind==='placements'){d.ad_type||='internal';d.template||='card';d.image_fit||='contain';if(d.crop_verified===''||d.crop_verified===undefined)d.crop_verified=false;d.priority=Number(d.priority||0);d.paused=old?!!decode(old.draft).paused:false;}
  if(kind==='entries'){const appError=appMetadataError(d.app_meta);if(appError)err('app_meta',appError);d=applyAppDownloads(d);if(!d.action_mode)d.action_mode='visit';for(const key of ['category_ids','tags','aliases'])if(d[key]==='')d[key]=[];}
  if(kind==='contents'){const before=old?decode(old.draft):null;if(syncedContent(d)&&!syncedContent(before))err('source_system','正式同步来源仅能通过同步任务创建');if(syncedContent(before)){const key=changedSourceField(before,d);if(key)err(key,'上游字段为只读，请在来源系统修改并重新同步');}}
  if(kind==='contents')for(const key of ['source_system','source_id'])if(typeof d[key]==='string')d[key]=d[key].trim();
  await validate(kind,d,rows,id);
  const revoked=kind==='contents'&&d.rights_status==='revoked';
  if(old)await query("UPDATE resources SET slug=?,draft=?,version=version+1,status='draft',revoked=? WHERE id=?",[d.slug||'site',JSON.stringify(d),revoked,id],db);
  else await query("INSERT INTO resources(id,kind,slug,draft,revoked) VALUES(?,?,?,?,?)",[id,kind,d.slug||'site',JSON.stringify(d),revoked],db);
 }else{
  if(!old)throw new AppError(404,'资源不存在');
  if(kind==='contents'&&syncedContent(d)&&['exclude','include'].includes(action)){
   if(!['super','operator'].includes(u.role))throw new AppError(403,'仅发布人员可以排除或恢复同步内容');
   if(action==='include'){if(!old.manual_excluded)throw new AppError(409,'此内容没有被人工排除');if(old.revoked)err('rights_status','撤权内容不能恢复，请先处理授权异常');const [source]=await query('SELECT payload FROM source_records WHERE source_system=? AND source_id=?',[d.source_system,d.source_id],db);if(!source||decode(source.payload)?.available!==true)err('source_id','来源可用状态未确认，不能恢复候选');}
   await query("UPDATE resources SET manual_excluded=?,published=NULL,status=?,version=version+1 WHERE id=?",[action==='exclude',action==='exclude'?'offline':'candidate',id],db);
  }else if(kind==='placements'&&['pause','resume'].includes(action)){
   if(!['super','operator'].includes(u.role)||!old.published)throw new AppError(403,'只有发布人员可以暂停或恢复已发布广告');
   const published={...decode(old.published),paused:action==='pause'};if(action==='resume')await validate(kind,published,rows,id,true);
   d={...d,paused:published.paused};await query('UPDATE resources SET draft=?,published=?,version=version+1 WHERE id=?',[JSON.stringify(d),JSON.stringify(published),id],db);
   await query('INSERT INTO revisions(resource_id,version,payload,actor) VALUES(?,?,?,?)',[id,old.version+1,JSON.stringify(published),u.username],db);
  }else if(action==='submit')await query("UPDATE resources SET status='pending',version=version+1 WHERE id=?",[id],db);
  else if(['publish','offline','rollback'].includes(action)){
   if(!['super','operator'].includes(u.role)||kind==='settings'&&u.role!=='super')throw new AppError(403,'当前账号没有发布权限');
   if(action==='rollback'&&kind==='contents'&&syncedContent(d))throw new AppError(409,'同步内容不能恢复历史源快照，请重新同步并审核');if(action==='rollback'){const [r]=await query('SELECT payload FROM revisions WHERE id=? AND resource_id=?',[input.revision_id||0,id],db);if(!r)throw new AppError(404,'发布版本不存在');d=decode(r.payload);}
   if(action!=='offline'){if(old.manual_excluded)err('source_id','此内容已人工排除，请先恢复候选并重新审核');if(kind==='contents'&&['laosiji-video','laosiji-comic'].includes(d.source_system)){const [source]=await query('SELECT payload FROM source_records WHERE source_system=? AND source_id=?',[d.source_system,d.source_id],db);if(!source||decode(source.payload)?.available!==true)err('source_id','来源不可用或尚未确认，不能发布或恢复旧版本');}await validate(kind,d,rows,id,true);if(kind==='placements'){d={...d,creative_version:old.version+1,ad_id:id,slot_id:adSlotId(d)};}if(kind==='contents')await checkContent(d);if(old.revoked)err('rights_status','资源已撤权，不能回滚或发布');await query("UPDATE resources SET published=?,draft=?,status='published',published_at=UTC_TIMESTAMP(3),version=version+1 WHERE id=?",[JSON.stringify(d),JSON.stringify(d),id],db);await query('INSERT INTO revisions(resource_id,version,payload,actor) VALUES(?,?,?,?)',[id,old.version+1,JSON.stringify(d),u.username],db);}
   else {if(id==='site')throw new AppError(422,'站点设置不能下架');await query("UPDATE resources SET published=NULL,status='offline',manual_excluded=IF(?,1,manual_excluded),version=version+1 WHERE id=?",[kind==='contents'&&syncedContent(d),id],db);}
  }else if(action==='delete'){
   if(kind==='contents'&&syncedContent(d))throw new AppError(409,'同步内容请使用人工排除，保留来源与历史记录');
   if(old.published)throw new AppError(409,'请先下架此资源');const refs=rows.filter(r=>r.id!==id&&[decode(r.draft),decode(r.published)].some(v=>v&&(v.company_id===id||v.parent_id===id||v.category_ids?.includes(id)||v.entry_id===id||v.entry_ids?.includes(id)||v.category_id===id||v.content_id===id)));if(refs.length)throw new AppError(409,`仍有 ${refs.length} 个关联资源，请先迁移引用`);await query('DELETE FROM resources WHERE id=?',[id],db);
  }else throw new AppError(400,'不支持此操作');
 }
 const adDetail=adOperation?{reason:input.reason.trim(),before:adActionSnapshot(decode(old.published)),after:adActionSnapshot(decode((await query('SELECT published FROM resources WHERE id=?',[id],db))[0]?.published))}:{};
 if(kind==='contents'){await recordContentHistory(old,'baseline',u.username,db);const [current]=await query('SELECT * FROM resources WHERE id=?',[id],db);await recordContentHistory(current,action,u.username,db);}
 await audit(db,u,action,id,{kind,version:(old?.version||0)+1,...(action==='restore_draft'?{restored_from:input.history_version}:{}),...adDetail});
 const result={id,version:(old?.version||0)+1};
 if(action==='save'||action==='restore_draft'){const [saved]=await query('SELECT * FROM resources WHERE id=?',[id],db);result.resource=resource(saved);}
 return result;
 });}finally{promotionCache.invalidate();}}

export function offlineImpact(rows,ids){
 const selected=new Set(ids);const targets=rows.filter(r=>selected.has(r.id));
 if(targets.length!==selected.size)throw new AppError(404,'部分资源不存在，请刷新列表');
 if(targets.some(r=>r.kind==='settings'))throw new AppError(422,'站点设置不能下架');
 const now=Date.now();const before=publicData(rows,now),after=publicData(rows.map(r=>selected.has(r.id)?{...r,published:null}:r),now);
 const hidden=Object.fromEntries(['companies','categories','entries','contents','placements'].map(kind=>{const remaining=new Set(after[kind].map(r=>r.id));return [kind,before[kind].filter(r=>!remaining.has(r.id)).length];}));
 const linked=value=>value&&(selected.has(value.company_id)||selected.has(value.parent_id)||selected.has(value.entry_id)||selected.has(value.category_id)||selected.has(value.content_id)||(value.category_ids||[]).some(id=>selected.has(id))||(value.entry_ids||[]).some(id=>selected.has(id)));
 const references=Object.fromEntries(['categories','entries','contents','placements'].map(kind=>[kind,rows.filter(r=>r.kind===kind&&!selected.has(r.id)&&[decode(r.draft),decode(r.published)].some(linked)).length]));
 return {targets:targets.map(r=>({id:r.id,version:r.version})),hidden,references,checked_at:new Date(now).toISOString()};
}
