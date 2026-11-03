'use client';
import {useState} from 'react';
import {adLocationDescriptions,adLocationPages,adLocationHref} from '../lib/ad-location';
export default function AdLocationDetails({location,overview,pageId='',device='pc',compact=false}){
 const pages=adLocationPages(overview,location,pageId),[choice,setChoice]=useState('');const selected=pages.find(p=>p.id===choice)||pages[0];
 const state=overview?.slots.find(s=>s.id===location)?.pages.find(p=>p.page_id===selected?.id)?.devices.find(d=>d.device===device),visible=state&&!state.disabled&&state.ids.length>0;
 return <div className={'ad-location-details'+(compact?' is-compact':'')}><p>{adLocationDescriptions[location]||'请选择广告位置'}</p>{pages.length>1?<label>打开具体页面<select aria-label="查看广告所在页面" value={selected?.id||''} onChange={e=>setChoice(e.target.value)}>{pages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>:selected&&<strong>{selected.name}</strong>}{selected?<><a className="ad-location-link" href={visible?adLocationHref(selected,location,device):selected.href} target="_blank" rel="noreferrer">{visible?'打开前台并定位此广告区域 ↗':'打开对应前台页面 ↗'}</a><small>{state?.disabled?'此设备或页面模块已停用，前台不展示。':visible?'前台对应区域会显示定位边框。':'该页面当前没有有效广告，不会显示占位框。'}{device==='h5'?' 请在手机或浏览器移动预览中打开。':''}</small></>:<small>暂无可访问的公开页面；先发布对应分类或内容。</small>}</div>;
}
