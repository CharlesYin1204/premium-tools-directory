import {can,sectionAction} from './permissions.js';
const leaf=(id,label,href,section)=>({id,label,href,section});
export const adminNavigation=[
 {...leaf('reports','数据报表','/admin/reports','reports'),icon:'chart'},
 {id:'directory',label:'站点管理',icon:'globe',children:[leaf('entries','网址管理','/admin/entries','entries'),leaf('companies','渠道管理','/admin/companies','companies'),leaf('categories','分类管理','/admin/categories','categories')]},
 {...leaf('apps','APP 下载','/admin/apps','apps'),icon:'globe'},
 {...leaf('video-library','视频库','/admin/video-library','contents'),icon:'play'},
 {...leaf('video-management','视频管理','/admin/video-management','contents'),icon:'play'},
 {...leaf('comic-management','漫画管理','/admin/comic-management','contents'),icon:'book'},
 {id:'ads',label:'广告位管理',icon:'compass',children:[leaf('ads-list','广告列表','/admin/placements','placements'),leaf('ads-positions','广告位置','/admin/placements?ad_view=positions','placements'),leaf('ads-performance','投放效果','/admin/placements?ad_view=performance','placements')]},
 {id:'ai',label:'AI 能力',icon:'activity',children:[leaf('ai-features','AI 工具推荐','/admin/ai#features','ai'),leaf('ai-models','模型管理','/admin/ai#models','ai')]},
 {id:'settings',label:'站点设置',icon:'settings',children:[leaf('landing','网站落地页','/admin/settings#landing','settings'),leaf('brand','品牌与联系','/admin/settings#brand','settings'),leaf('home','首页与模块','/admin/settings#home','settings'),{id:'portal',label:'公告与外观',children:[['appearance','外观与入口'],['announcements','站点公告'],['news','资讯链接'],['friends','友情链接']].map(([id,label])=>leaf('portal-'+id,label,'/admin/settings#portal-'+id,'settings'))},leaf('video','视频页面','/admin/settings#video','settings'),leaf('copy','文案与菜单','/admin/settings#copy','settings'),leaf('support','客服设置','/admin/settings#support','settings'),leaf('seo','搜索优化','/admin/settings#seo','settings')]},
 {id:'system',label:'系统管理',icon:'shield',children:[leaf('users','账号与权限','/admin/users','users'),leaf('audit','操作日志','/admin/audit','audit'),leaf('password','修改密码','/admin/password','password')]}
];
export function navigationForRole(role,nodes=adminNavigation){return nodes.flatMap(node=>{if(node.children){const children=navigationForRole(role,node.children);return children.length?[{...node,children}]:[];}return can(role,sectionAction(node.section))?[node]:[];});}
export function activeAdminLeaf(section,params,hash=''){
 if(section==='settings')return ['landing','brand','home','video','copy','support','seo','portal-appearance','portal-announcements','portal-news','portal-friends'].includes(hash)?hash:'brand';
 if(section==='ai')return hash==='models'?'ai-models':'ai-features';
 if(section==='placements')return params.get('ad_view')==='positions'?'ads-positions':params.get('ad_view')==='performance'?'ads-performance':'ads-list';
 if(section==='video-library')return 'video-library';
 if(section==='video-management')return 'video-management';
 if(section==='comic-management')return 'comic-management';
 if(section==='contents')return params.get('type')==='comic'?'comic-management':'video-management';
 return section;
}
