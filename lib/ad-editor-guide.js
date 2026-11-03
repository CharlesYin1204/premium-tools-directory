import {placementConflictDetails,placementTime} from './placement-rules.js';
import {adSlots,adTemplate,adCapacity} from './ad-slots.js';
export function adDraftChecklist(data,entry,resources=[]){
 const slot=adSlots[data.location],banner=adTemplate(data)==='banner';
 return [
 {key:'location',label:'选择有效的广告位置',ok:!!slot},
 {key:'entry_id',label:'目标站点已发布且可用',ok:!!entry?.has_published&&!entry.revoked&&!entry.manual_excluded},
 ...(data.location==='category'?[{key:'category_id',label:'选择已发布的分类页面',ok:resources.some(r=>r.id===data.category_id&&r.kind==='categories'&&r.has_published&&!r.revoked&&!r.manual_excluded)}]:[]),
 ...(data.location==='detail'?[{key:'content_id',label:'选择已发布的内容页面',ok:resources.some(r=>r.id===data.content_id&&r.kind==='contents'&&r.has_published&&!r.revoked&&!r.manual_excluded)}]:[]),
 {key:'device',label:'设备与所选位置匹配',ok:['all','pc','h5'].includes(data.device)&&(!slot?.devices||slot.devices.includes(data.device))},
 ...(!banner?[]:[...(data.device!=='h5'?[{key:'pc_image_url',label:'提供电脑端横幅素材',ok:!!data.pc_image_url}]:[]),...(data.device!=='pc'?[{key:'h5_image_url',label:'提供手机端横幅素材',ok:!!data.h5_image_url}]:[])]),
 {key:'end_at',label:'排期起止时间正确',ok:(!data.start_at||Number.isFinite(placementTime(data.start_at)))&&(!data.end_at||Number.isFinite(placementTime(data.end_at)))&&(!data.start_at||!data.end_at||Date.parse(data.end_at)>Date.parse(data.start_at))}
 ];
}
export function adPositionPreset(location,{device='all',pageId=''}={}){
 const slot=adSlots[location];if(!slot)return {};
 return {location,template:slot.templates[0],device:slot.devices?.[0]||device,category_id:location==='category'&&pageId.startsWith('category:')?pageId.slice(9):'',content_id:location==='detail'&&pageId.startsWith('detail:')?pageId.slice(7):''};
}

export function adDraftConflict(data,resources){
 if(!adSlots[data.location]||!data.entry_id)return null;
 return placementConflictDetails(data,resources.filter(r=>r.kind==='placements'&&r.id!==data.id&&r.has_published&&!r.revoked&&!r.manual_excluded&&r.live_ad).map(r=>({...r.live_ad,id:r.id})),adCapacity(data));
}
