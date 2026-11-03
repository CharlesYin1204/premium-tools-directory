export function defaultPortal(){return {theme:'dark',sidebar:true,submit_label:'收录与反馈',submit_url:'/copyright',engines:[],announcements:[],news:[],friends:[]};}
export function portalConfig(value){return {...defaultPortal(),...(value&&typeof value==='object'&&!Array.isArray(value)?value:{})};}
export function portalUrl(value,{local=true,template=false}={}){
 if(typeof value!=='string'||value.length>2048||/[\x00-\x20\x7f\\]/.test(value))return false;
 if(local&&/^\/(?!\/)/.test(value))return !/%(?:0[0-9a-f]|1[0-9a-f]|5c|7f)/i.test(value);
 try{const url=new URL(template?value.replace('{query}','demo'):value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&!['localhost','127.0.0.1','0.0.0.0','[::1]'].includes(url.hostname);}catch{return false;}
}
export function portalError(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return '导航主题配置格式错误';
 if(!['dark','light'].includes(value.theme)||typeof value.sidebar!=='boolean')return '请选择主题和侧栏开关';
 if(typeof value.submit_label!=='string'||!value.submit_label.trim()||value.submit_label.length>20||!portalUrl(value.submit_url))return '收录入口名称1–20字，地址为站内路径或HTTPS地址';
 for(const [kind,max] of [['engines',8],['announcements',10],['news',12],['friends',24]]){
  const items=value[kind];if(!Array.isArray(items)||items.length>max)return `${kind}最多${max}项`;
  const ids=new Set();for(const item of items){if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(item.id)||ids.has(item.id))return `${kind}编号必须唯一`;ids.add(item.id);if(typeof item.title!=='string'||!item.title.trim()||item.title.length>120||typeof item.enabled!=='boolean')return `${kind}标题1–120字，开关须为布尔值`;
   if(kind==='announcements'&&item.body!==undefined&&(typeof item.body!=='string'||item.body.length>5000))return '公告正文最多5000字';
   if(!(kind==='announcements'&&item.body?.trim()&&!item.url)&&!portalUrl(item.url,{local:kind!=='engines',template:kind==='engines'}))return `${kind}请填写有效地址`;
   if(kind==='engines'&&(item.url.split('{query}').length!==2||!item.url.includes('?')||item.url.indexOf('{query}')<item.url.indexOf('?')))return '搜索地址必须在查询参数中包含一个{query}占位符';
   if(kind==='news'&&(typeof item.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(item.date)||!Number.isFinite(Date.parse(item.date))||new Date(item.date).toISOString().slice(0,10)!==item.date))return '资讯日期格式为有效的YYYY-MM-DD';
  }
 }
 return null;
}
