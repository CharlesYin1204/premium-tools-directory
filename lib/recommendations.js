// Only pass the unified public view. No advertising or unverified popularity input.
export function defaultRanking(){return {tag_weight:1,category_weight:2,recency_weight:0,recency_days:30,fallback:'recent'};}
export function rankingError(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return '自然推荐规则格式不正确';
 if(Object.keys(value).some(k=>!Object.keys(defaultRanking()).includes(k)))return '自然推荐规则包含未知字段';
 for(const key of ['tag_weight','category_weight','recency_weight'])if(!Number.isInteger(value[key])||value[key]<0||value[key]>100)return '推荐权重须为0–100的整数';
 if(!Number.isInteger(value.recency_days)||value.recency_days<1||value.recency_days>365)return '新鲜度时间窗须为1–365天';
 if(!['recent','order'].includes(value.fallback))return '请选择最近发布或运营排序补足';
 return null;
}
export function rankingConfig(config){return {...defaultRanking(),...config?.ranking};}
export function recommendationRuleId(config){const r=rankingConfig(config);return `R1-${config?.enabled===false?0:1}-${config?.limit??4}-${r.tag_weight}-${r.category_weight}-${r.recency_weight}-${r.recency_days}-${r.fallback}`;}
const values=v=>new Set(Array.isArray(v)?v:[]);
const overlap=(a,b)=>[...values(a)].filter(x=>b.has(x)).length;
function timestamp(value){if(!value)return 0;const raw=String(value).replace(' ','T'),n=Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(raw)?raw:raw+'Z');return Number.isFinite(n)?n:0;}
function identity(item){return item.source_system&&item.source_id?JSON.stringify([item.source_system,item.source_id]):null;}
export function recommendContents(content,contents,config={},at=Date.now()){
 const r=rankingConfig(config),categories=values(content.category_ids),tags=values(content.tags),currentIdentity=identity(content);
 const seenIds=new Set([content.id]),seenSources=new Set(currentIdentity?[currentIdentity]:[]);
 const records=[];
 for(const item of contents){
  if(item.type!==content.type||item.revoked||item.manual_excluded||item.has_published===false||item.available===false||item.rights_status&&item.rights_status!=='approved'||seenIds.has(item.id))continue;
  const source=identity(item);if(source&&seenSources.has(source))continue;
  seenIds.add(item.id);if(source)seenSources.add(source);
  const tagMatches=overlap(item.tags,tags),categoryMatches=overlap(item.category_ids,categories),published=timestamp(item.published_at);
  const freshness=published&&published<=at?Math.max(0,1-(at-published)/(r.recency_days*86400000)):0;
  const parts={tags:tagMatches*r.tag_weight,categories:categoryMatches*r.category_weight,recency:freshness*r.recency_weight};
  records.push({item,tagMatches,categoryMatches,parts,score:parts.tags+parts.categories+parts.recency,published});
 }
 const stable=(a,b)=>String(a.item.id).localeCompare(String(b.item.id));
 const order=(a,b)=>(Number(a.item.sort_order)||0)-(Number(b.item.sort_order)||0)||b.published-a.published||stable(a,b);
 records.sort((a,b)=>b.score-a.score||(r.fallback==='order'?order(a,b):b.published-a.published||order(a,b)));
 const limit=Number.isInteger(config.limit)?Math.max(1,Math.min(12,config.limit)):4;
 return {rule_id:recommendationRuleId(config),evaluated_at:new Date(at).toISOString(),candidate_count:records.length,items:config.enabled===false?[]:records.slice(0,limit),degradation:'业务热度字段与可信时间窗尚未接通，当前仅使用标签、分类和已发布时间；不使用广告权重，不标为热门。'};
}
