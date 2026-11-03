export const HOME_MODULE_DEFINITIONS=[
 {id:'notice',label:'站点公告',title:'站点公告',limit:3,max:10,tabs:false,help:'固定在搜索上方，公告内容在导航主题中维护，空内容自动隐藏。'},
 {id:'quick',label:'快捷直达',title:'快捷直达',limit:24,max:48,tabs:true,help:'内容来自已发布站点；分类Tab来自分类管理。'},
 {id:'spotlight',label:'内容轮播',title:'精选内容',limit:4,max:8,tabs:false,help:'使用已发布且授权有效的视频/漫画封面，支持手动切换，不生成虚假资讯。'},
 {id:'news',label:'最近更新',title:'最近更新',limit:5,max:12,tabs:false,help:'自动按最近发布时间展示已公开的视频和漫画，草稿和下架内容不展示。'},
 {id:'promotions',label:'推荐产品',title:'值得发现的产品',limit:6,max:6,tabs:false,help:'内容、设备和有效期在“广告位管理”中维护。'},
 {id:'bookmarks',label:'我的常用',title:'我的常用',limit:12,max:24,tabs:false,help:'访客从已发布入口中收藏，保存于当前浏览器；不冒充账号云同步。'},
 {id:'latest',label:'最新收录',title:'最新收录',limit:6,max:24,tabs:false,help:'按真实发布时间展示已发布入口，不使用模拟热度。'},
 {id:'directory',label:'分类发现',title:'你的兴趣，都有去处。',limit:8,max:24,tabs:true,help:'分组来自分类管理；标签Tab来自站点入口的标签。'},
 {id:'media',label:'内容发现',title:'内容发现',limit:4,max:12,tabs:true,help:'视频、漫画及品牌在内容管理中维护，仅展示已发布内容。'},
 {id:'friends',label:'友情链接',title:'友情链接',limit:12,max:24,tabs:false,help:'链接来自导航主题配置，没有有效链接时隐藏。'}
];
export function defaultHomeModules(){return HOME_MODULE_DEFINITIONS.map(({id,title,limit,tabs})=>({id,title,limit,tabs,enabled:true}));}
export function homeModules(value){if(!Array.isArray(value))return defaultHomeModules();return [...value,...defaultHomeModules().filter(d=>!value.some(m=>m.id===d.id)).map(m=>({...m,enabled:false}))];}
export function homeModuleError(value){
 if(!Array.isArray(value)||!(value.length===HOME_MODULE_DEFINITIONS.length||value.length===4&&['quick','promotions','directory','media'].every(id=>value.some(m=>m?.id===id))))return '请保留全部首页模块，可关闭不需要的模块。';
 if(new Set(value.map(x=>x?.id)).size!==value.length)return '首页模块不能重复。';
 for(const item of value){const def=HOME_MODULE_DEFINITIONS.find(d=>d.id===item?.id);if(!def)return '首页模块类型无效。';if(typeof item.title!=='string'||!item.title.trim()||item.title.length>60)return def.label+'标题需为1–60字。';if(typeof item.enabled!=='boolean'||typeof item.tabs!=='boolean')return def.label+'开关格式无效。';if(!Number.isInteger(item.limit)||item.limit<1||item.limit>def.max)return def.label+'展示数量须为1–'+def.max+'。';}
 return null;
}
