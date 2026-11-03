export const defaultReturnHome=()=>({enabled:false,title:'回家路口',note:'保存常用入口，方便下次访问。',links:[]});
export function returnHomeError(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.enabled!=='boolean')return '回家路口配置格式不正确';
 if(typeof value.title!=='string'||!value.title.trim()||value.title.length>24||typeof value.note!=='string'||value.note.length>160)return '标题1–24字，说明最多160字';
 if(!Array.isArray(value.links)||value.links.length>5||value.enabled&&!value.links.length)return '最多配置5个真实入口；启用时至少需要1个入口';
 const urls=new Set();for(const link of value.links){
  if(!link||typeof link.label!=='string'||!link.label.trim()||link.label.length>30||typeof link.url!=='string'||link.url.length>2048)return '每个入口需名称（1–30字）和完整HTTPS地址';
  let u;try{u=new URL(link.url);}catch{return '入口地址须为完整HTTPS网址';}
  if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search)return '入口使用HTTPS，不得包含账号、查询参数或片段';
  if(urls.has(u.href))return '入口地址不能重复';urls.add(u.href);
  if(!['permanent','backup'].includes(link.kind)||!['unchecked','ok','failed'].includes(link.check_status))return '请选择入口类型与人工核验状态';
  if(link.check_status!=='unchecked'&&!link.checked_at)return '已核验入口须填写最近人工核验日期';
  if(link.checked_at){if(!/^\d{4}-\d{2}-\d{2}$/.test(link.checked_at)||!Number.isFinite(Date.parse(link.checked_at))||new Date(link.checked_at).toISOString().slice(0,10)!==link.checked_at||link.checked_at>new Date(Date.now()+8*3600000).toISOString().slice(0,10))return '核验日期须为真实且不晚于今天的日期';}
 }
 return null;
}
export function visibleReturnHome(value){return value?.enabled&&!returnHomeError(value)?value:null;}
