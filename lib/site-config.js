import {portalError} from './portal-config.js';
import {defaultReturnHome,returnHomeError} from './return-home.js';
import {defaultVideoDetail,videoDetailError} from './video-detail-config.js';
// Defaults only migrate existing presentation; published values are stored in MySQL.
export const copyFields = [
 ['brand_tagline','品牌英文副标','PREMIUM TOOLS',60],['header_search','页头搜索提示','搜索你感兴趣的工具',60],['search_placeholder','搜索框提示','搜索工具、用途或标签…',80],['search_button','搜索按钮','搜索',12],
 ['hero_kicker','首页横幅眉题','灵感与好工具，在这里相遇',80],['hero_caption','横幅图片文案','GOOD TOOLS. NEW IDEAS.',80],['explore_label','探索按钮','开始探索',20],
 ['quick_tools_title','工具快捷标题','找个好工具',30],['quick_tools_note','工具快捷说明','让想法更快实现',60],['quick_video_title','视频快捷标题','看一点新鲜',30],['quick_video_note','视频快捷说明','打开灵感的另一面',60],['quick_comic_title','漫画快捷标题','读一个故事',30],['quick_comic_note','漫画快捷说明','留点时间给想象',60],
 ['brand_note_title','底部品牌标题','每一个好工具，都值得被发现。',80],['brand_note_text','底部品牌说明','精选工具，让效率触手可及。',160],['about_link','品牌介绍按钮','了解我们',20],
 ['directory_title','分类页标题','每种兴趣，都有入口。',80],['directory_note','分类页说明','有序整理，自由发现。找到属于你的下一站。',200],['search_title','搜索页标题','你的好奇，值得一个答案。',80],
 ['videos_title','视频页标题','让好内容，拓宽你的视野。',80],['videos_note','视频页说明','精选视频，发现新的灵感与可能。',200],['comics_title','漫画页标题','翻开想象的下一页。',80],['comics_note','漫画页说明','精选漫画，留一点时间给阅读。',200],['about_title','关于页标题','发现更高效的工作方式。',80],['about_kicker','关于页眉题','PREMIUM TOOLS',60],
 ['support_title','客服面板标题','联系客服',30],['support_note','客服说明','选择适合你的联系方式',120],['support_button','客服按钮','客服',12]
];
export const adminMenuDefaults=[['dashboard','工作概览'],['reports','数据报表'],['entries','站点入口'],['companies','渠道管理'],['categories','分类管理'],['contents','内容管理'],['placements','广告位管理'],['sync','同步任务'],['ai','AI 能力'],['audit','操作日志'],['settings','站点设置'],['users','账号与权限']];
export const channelTypes={telegram:'Telegram',whatsapp:'WhatsApp',wechat:'微信',qq:'QQ',email:'邮箱',phone:'电话',discord:'Discord',line:'LINE',web:'在线客服 / 其他社交媒体'};
export function configDefaults(){return {entry_landing_enabled:true,return_home:defaultReturnHome(),video_detail:defaultVideoDetail(),page_copy:Object.fromEntries(copyFields.map(([key,,value])=>[key,value])),navigation:[['/','发现','compass'],['/categories','分类导航','grid'],['/ai-search','AI 工具推荐','search']].map(([href,label,icon])=>({href,label,icon,enabled:true})),footer_navigation:[['/about','关于我们'],['/copyright','版权与反馈'],['/privacy','隐私说明'],['/admin','运营后台']].map(([href,label])=>({href,label,enabled:true})),admin_menu_labels:Object.fromEntries(adminMenuDefaults),support_enabled:false,support_channels:[]};}
export function copy(site,key){return site?.page_copy?.[key]??copyFields.find(f=>f[0]===key)?.[2]??'';}
export function siteConfig(site){return {...configDefaults(),...site};}
export function localLink(value){return typeof value==='string'&&/^\/(?!\/)[^\s\\]*$/.test(value)&&value.length<=2048&&!/[\x00-\x1f\x7f]/.test(value)&&!/%(?:0[0-9a-f]|1[0-9a-f]|5c|7f)/i.test(value);}
export function supportHref(c){if(c.type==='email')return 'mailto:'+c.value;if(c.type==='phone')return 'tel:'+c.value;return c.value;}
export function configError(d){
 const fail=(key,message)=>({key,message});
 if(d.entry_landing_enabled!==undefined&&d.entry_landing_enabled!==''&&typeof d.entry_landing_enabled!=='boolean')return fail('entry_landing_enabled','落地页开关须为布尔值');
 if(d.portal!==undefined&&d.portal!==''){const message=portalError(d.portal);if(message)return fail('portal',message);}
 if(d.return_home!==undefined&&d.return_home!==''){const error=returnHomeError(d.return_home);if(error)return fail('return_home',error);}
 if(d.video_detail!==undefined&&d.video_detail!==''){const error=videoDetailError(d.video_detail);if(error)return fail('video_detail',error);}
 for(const [key,max] of Object.entries({hero_title:100,hero_subtitle:300,seo_description:300,footer:500,contact_email:254,privacy:20000,rights_policy:20000,approval_note:10000}))if(d[key]!==undefined&&(typeof d[key]!=='string'||d[key].length>max))return fail(key,`此字段最多 ${max} 个字符`);
 if(d.page_copy!=null&&d.page_copy!==''){if(typeof d.page_copy!=='object'||Array.isArray(d.page_copy))return fail('page_copy','文案格式不正确');for(const [key,label,,max] of copyFields){const v=d.page_copy[key];if(v!==undefined&&(typeof v!=='string'||!v.trim()||v.length>max))return fail('page_copy',`${label}须为 1–${max} 个字符`);}if(Object.keys(d.page_copy).some(k=>!copyFields.some(f=>f[0]===k)))return fail('page_copy','包含未知文案字段');}
 for(const key of ['navigation','footer_navigation'])if(d[key]!=null&&d[key]!==''){if(!Array.isArray(d[key])||d[key].length>12)return fail(key,'最多 12 项菜单');for(const item of d[key])if(!item||typeof item.label!=='string'||!item.label.trim()||item.label.length>20||typeof item.enabled!=='boolean'||typeof item.href!=='string'||!item.href||item.href.length>2048)return fail(key,'菜单名称 1–20 字，地址必填，开关须为布尔值');if(new Set(d[key].map(i=>i.href)).size!==d[key].length)return fail(key,'同组菜单地址不能重复');}
 if(d.admin_menu_labels!=null&&d.admin_menu_labels!==''){if(typeof d.admin_menu_labels!=='object'||Array.isArray(d.admin_menu_labels))return fail('admin_menu_labels','后台菜单格式不正确');for(const [k,v] of Object.entries(d.admin_menu_labels))if(!adminMenuDefaults.some(i=>i[0]===k)||typeof v!=='string'||!v.trim()||v.length>20)return fail('admin_menu_labels','后台菜单名称须为 1–20 字');}
 if(d.support_enabled!==undefined&&d.support_enabled!==''&&typeof d.support_enabled!=='boolean')return fail('support_enabled','客服开关格式不正确');
 if(d.support_channels!=null&&d.support_channels!==''){if(!Array.isArray(d.support_channels)||d.support_channels.length>20)return fail('support_channels','最多 20 个客服渠道');for(const c of d.support_channels){if(!c||!channelTypes[c.type]||typeof c.label!=='string'||!c.label.trim()||c.label.length>30||typeof c.enabled!=='boolean'||typeof c.value!=='string'||c.value.length>2048||typeof c.note!=='string'||c.note.length>120||typeof c.qr_url!=='string'||c.qr_url.length>2048)return fail('support_channels','渠道名称 1–30 字，说明最多120字，联系方式和二维码地址最多2048字');if(!c.value&&!c.qr_url)return fail('support_channels','每个渠道至少填写联系方式或二维码');if(c.value&&c.type==='email'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.value))return fail('support_channels','客服邮箱格式不正确');if(c.value&&c.type==='phone'&&!/^\+?[0-9 ()-]{3,30}$/.test(c.value))return fail('support_channels','电话号码须为 3–30 位数字及 +、空格、括号、短横线');}}
 return null;
}
