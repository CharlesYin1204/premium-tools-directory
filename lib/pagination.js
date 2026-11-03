export const PUBLIC_PAGE_SIZE=24;
export function pagination(total,value,size=PUBLIC_PAGE_SIZE){
 const pages=Math.max(1,Math.ceil(total/size));
 const raw=typeof value==='string'?value:'';
 const requested=/^[1-9]\d*$/.test(raw)?Number(raw):1;
 const page=Math.min(pages,Number.isFinite(requested)?requested:pages);
 return {page,pages,start:(page-1)*size,end:page*size};
}
export function paginationUrl(params,key,page){
 const next=new URLSearchParams();
 for(const [name,value] of Object.entries(params)){if(name===key||key!=='page'&&name==='page')continue;for(const item of Array.isArray(value)?value:[value])if(item!=null)next.append(name,String(item));}
 next.set(key,String(page));return '?'+next;
}

export const HOME_CATEGORY_LIMIT=8;
export function pageNumbers(page,pages){
 const selected=[...new Set([1,pages,page-1,page,page+1].filter(n=>n>=1&&n<=pages))].sort((a,b)=>a-b);
 return selected.flatMap((n,i)=>i&&n-selected[i-1]>1?['gap-'+n,n]:[n]);
}

export const CONTENT_PAGE_SIZES=[12,24,48];
export function contentPageSize(value){return typeof value==='string'&&CONTENT_PAGE_SIZES.includes(Number(value))?Number(value):PUBLIC_PAGE_SIZE;}
