'use client';
import {useState} from 'react';
import {adTemplate,adImage,adSlots} from '../lib/ad-slots';
function Thumbnail({src,label}){
 const [failed,setFailed]=useState(false);
 return src&&!failed?<img src={src} alt={label+'素材缩略图'} loading="lazy" onError={()=>setFailed(true)}/>:<span className="ad-list-material-empty">{src?'图片加载失败':'未配置素材'}</span>;
}
export default function AdListMaterial({ad,context,resources,snapshotLabel='草稿素材 · 关联入口取线上版本'}){
 const entry=context?.entries.find(e=>e.id===ad.entry_id),draftEntry=resources.find(e=>e.kind==='entries'&&e.id===ad.entry_id),company=entry?context.companies.find(c=>c.id===entry.company_id):null;
 return <div className="ad-list-material"><small>{snapshotLabel}</small><div className="ad-list-thumbnails">{['pc','h5'].map(device=>{const enabled=(ad.device==='all'||ad.device===device)&&(!adSlots[ad.location]?.devices||adSlots[ad.location].devices.includes(device));const own=adImage(ad,device),src=own||(adTemplate(ad)==='card'?entry?.icon_url:'');return <figure key={device}><figcaption>{device.toUpperCase()} · {!enabled?'未启用':own?'独立素材':adTemplate(ad)==='card'?'继承入口图标':'需独立素材'}</figcaption>{enabled?<Thumbnail key={src||'empty'} src={src} label={device.toUpperCase()}/>:<span className="ad-list-material-empty">此端不展示</span>}</figure>;})}</div><strong>目标：{entry?.name||draftEntry?.name||ad.entry_id||'未配置'}</strong><small>归属渠道：{company?.name||'—'}</small>{!context?<small role="status">关联资源未读取，请刷新列表。</small>:!entry?<small className="ad-list-material-warning">关联入口当前未公开或其渠道、分类不可用。</small>:<small>{entry.action_mode==='download'?'按终端下载':'直接访问'} · {entry.target_url}</small>}<small>缩略图完整显示；裁切及最终目标请在预览中核对。</small></div>;
}
