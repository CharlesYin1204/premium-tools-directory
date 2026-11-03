import {rankingError} from './recommendations.js';
export function defaultVideoDetail(){return {enabled:true,title:'继续发现',note:'优先为你展示同分类与同标签的内容',limit:4};}
export function videoDetailConfig(site){return {...defaultVideoDetail(),...site?.video_detail};}
export function videoDetailError(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return '视频页面配置格式不正确';
 if(Object.keys(value).some(key=>!['enabled','title','note','limit','ranking'].includes(key)))return '包含未知的视频页面配置';
 if(typeof value.enabled!=='boolean')return '显示推荐开关须为布尔值';
 if(typeof value.title!=='string'||!value.title.trim()||value.title.length>60)return '推荐标题须为 1–60 字';
 if(typeof value.note!=='string'||value.note.length>160)return '推荐说明最多 160 字';
 if(!Number.isInteger(value.limit)||value.limit<1||value.limit>12)return '推荐数量须为 1–12 的整数';
 if(value.ranking!==undefined){const error=rankingError(value.ranking);if(error)return error;}
 return null;
}
