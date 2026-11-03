import {contentMissing} from './content-readiness.js';
export function videoMatches(item,filters,categories=[]){
 const includes=(value,query)=>!query||String(value||'').toLowerCase().includes(String(query).toLowerCase());
 if(!includes([item.title,item.original_title,item.source_id].join(' '),filters.q)||!includes(item.director,filters.director)||!includes(item.actors,filters.actors)||!includes(item.region,filters.region)||!includes(item.language,filters.language)||!includes((item.tags||[]).join(' '),filters.tag))return false;
 if(filters.status&&item.status!==filters.status||filters.source&&videoSourceKey(item)!==filters.source)return false;
 const selected=item.category_ids||[];
 if(filters.primary&&!selected.some(id=>{let current=categories.find(c=>c.id===id);const visited=new Set();while(current&&!visited.has(current.id)){if(current.id===filters.primary)return true;visited.add(current.id);current=categories.find(c=>c.id===current.parent_id);}return false;}))return false;
 if(filters.secondary&&!selected.includes(filters.secondary))return false;
 if(filters.min_rating!==''&&filters.min_rating!=null&&(item.rating==null||item.rating===''||Number(item.rating)<Number(filters.min_rating)))return false;
 if(filters.max_rating!==''&&filters.max_rating!=null&&(item.rating==null||item.rating===''||Number(item.rating)>Number(filters.max_rating)))return false;
 if(filters.release_from&&(!item.release_date||item.release_date<filters.release_from)||filters.release_to&&(!item.release_date||item.release_date>filters.release_to))return false;
 return true;
}
export function videoQuality(item,resources){const missing=contentMissing(item,resources),issues=missing.map(field=>'待补充：'+field);if(!item.summary||item.summary.trim().length<30)issues.push('简介建议至少 30 字');if(!item.tags?.length)issues.push('补充相关标签');return {score:Math.max(0,100-issues.length*10),issues};}
export function videoSourceKey(item){return item.source_site_id?[item.source_system||'source',item.source_site_id].join(':'):item.source_system||'';}
export function videoCategoryNames(item,categories){const primary=new Set(),secondary=new Set();for(const id of item.category_ids||[]){let current=categories.find(c=>c.id===id),path=[],seen=new Set();while(current&&!seen.has(current.id)){seen.add(current.id);path.unshift(current.name);current=categories.find(c=>c.id===current.parent_id);}if(path.length){primary.add(path[0]);if(path.length>1)secondary.add(path.slice(1).join(' / '));}}return {primary:[...primary],secondary:[...secondary]};}
export function videoSeo(item){const title=String(item.title||'').trim(),summary=String(item.summary||'').trim(),tags=item.tags||[];const issues=[];if(!title)issues.push('补充影片标题');if(summary.length<80)issues.push('简介建议不少于 80 字');if(!item.cover_url)issues.push('需要可用的封面图片');if(!tags.length)issues.push('补充相关标签');return {score:(title?30:0)+(summary.length>=80?30:summary?15:0)+(item.cover_url?20:0)+(tags.length?20:0),issues,suggestion:{title:title?title+'｜剧情介绍与影片资料':'补充影片标题',description:summary.slice(0,155),keywords:[title,...tags].filter(Boolean).slice(0,12),canonical_hint:item.slug?'/video/'+item.slug:'待填写页面标识',schema:{'@context':'https://schema.org','@type':item.video_type==='series'?'TVSeries':'Movie',name:title,description:summary.slice(0,300),image:item.cover_url||undefined}}};}
