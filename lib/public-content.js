import {recommendContents} from './recommendations.js';
export function publishedDate(value){
 if(!value)return null;
 const raw=String(value).replace(' ','T');const date=new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(raw)?raw:raw+'Z');
 if(Number.isNaN(+date))return null;
 return {iso:date.toISOString(),label:new Date(+date+8*3600000).toISOString().slice(0,10)};
}
export function contentFilterOptions(contents,categories,type){
 const items=contents.filter(c=>c.type===type);
 const categoryIds=new Set(items.flatMap(c=>c.category_ids||[]));
 return {categories:categories.filter(c=>categoryIds.has(c.id)),tags:[...new Set(items.flatMap(c=>c.tags||[]))].sort((a,b)=>a.localeCompare(b,'zh-CN'))};
}
// Input is the existing published view, so unavailable resources never enter recommendations.
export function relatedContents(content,contents,limit=4){
 return recommendContents(content,contents,{limit}).items.map(r=>r.item);
}
