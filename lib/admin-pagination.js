export const ADMIN_PAGE_SIZES=[10,20,50,100];
export function adminPageSize(value){return typeof value==='string'&&ADMIN_PAGE_SIZES.includes(Number(value))?Number(value):20;}
export function adminPage(total,value,size=20){const pages=Math.max(1,Math.ceil(total/size));const n=typeof value==='string'&&/^[1-9]\d*$/.test(value)?Number(value):1;const page=Math.min(pages,Number.isFinite(n)?n:pages);return {page,pages,start:(page-1)*size,end:page*size};}
