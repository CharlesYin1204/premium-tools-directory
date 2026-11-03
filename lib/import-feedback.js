const aliases={
 display_domain:['页面显示域名','显示域名','网站域名','域名','domain'],
 name:['页面显示名称','网站名称','网站名','名称','title'],
 target_url:['目标网址URL','目标网址','网站地址','网站网址','网址','链接','url','link'],
 description:['页面可见介绍','简介','描述'],
 category_ids:['页面栏目','栏目','分类','分类名称','所属分类','categories'],
 company_id:['渠道','渠道名称','所属渠道'],
 icon_url:['Icon或图片URL','图标','图标URL'],
 android_url:['APP下载链接'],
};
const normalize=value=>String(value).trim().toLowerCase().replace(/[\s_（）()]/g,'');
export function importMapping(headers,specs){
 const normalized=headers.map(normalize);
 return Object.fromEntries(specs.map(([key,label])=>{
  // Exact schema headers take precedence; ambiguous aliases require manual selection.
  const exact=headers.indexOf(key);if(exact>=0)return [key,exact];
  const names=[key,label,...(aliases[key]||[])].map(normalize);
  const matches=normalized.flatMap((h,i)=>names.includes(h)?[i]:[]);
  return [key,matches.length===1?matches[0]:-1];
 }));
}
export function importError(result,specs){
 const labels=Object.fromEntries(specs.map(([key,label])=>[key,label]));
 const details=Object.entries(result.fields||{}).map(([key,value])=>(labels[key]||key)+'：'+String(value));
 return [result.message||'导入失败',...details,...(result.batch_id?['批次：'+result.batch_id]:[])].join('；');
}
