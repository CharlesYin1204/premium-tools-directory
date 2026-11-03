'use client';
import {adSnapshotChanges} from '../lib/ad-action';
import {useState,useEffect,useRef} from 'react';
import Link from 'next/link';
import {adminApi} from '../lib/admin-api';
import {updatedDisplay} from '../lib/content-readiness';
import {locations} from '../lib/catalog';
const fields={name:'广告名称',ad_type:'广告类型',title:'素材标题',description:'素材说明',cta:'按钮文案',entry_id:'目标入口编号',location:'投放位置',category_id:'限定分类编号',content_id:'限定内容编号',device:'设备',start_at:'开始时间（上海）',end_at:'结束时间（上海）',paused:'暂停状态',template:'模板',pc_image_url:'PC素材地址',h5_image_url:'H5素材地址',image_fit:'图片展示方式',crop_verified:'裁切确认',priority:'优先级',sort_order:'运营顺序',creative_version:'素材版本'};
function value(key,v){if(v===null||v===undefined)return '未记录或未配置';if(v==='')return '空';if(typeof v==='boolean')return v?'是':'否';if(key==='location')return locations[v]?.label||v;if(key==='device')return {all:'PC / H5',pc:'桌面 PC',h5:'移动 H5'}[v]||v;return String(v);}
export function AdSnapshotDiff({before,after,known=true}){
 if(!known)return <p>历史未记录操作前后快照，无法还原本次差异。</p>;
 const changed=adSnapshotChanges(before,after);
 return <div className="ad-history-diff">{!before&&<p>操作前无线上版本。</p>}{!after&&<p>操作后无线上版本。</p>}{!changed.length?<p>已记录字段没有变化。</p>:<div className="table-wrap"><table><thead><tr><th>字段</th><th>之前</th><th>之后</th></tr></thead><tbody>{changed.map(key=><tr key={key}><th scope="row">{fields[key]}</th><td>{before?value(key,before[key]):'无线上版本'}</td><td>{after?value(key,after[key]):'无线上版本'}</td></tr>)}</tbody></table></div>}</div>;
}
export default function AdHistory({id,version,locked}){
 const [open,setOpen]=useState(false),[rows,setRows]=useState([]),[next,setNext]=useState(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const generation=useRef(0),inflight=useRef(false);
 useEffect(()=>{++generation.current;inflight.current=false;setRows([]);setNext(null);setLoaded(false);setError('');setBusy(false);},[id,version]);
 useEffect(()=>()=>{++generation.current;},[]);
 async function read(cursor){if(inflight.current)return;inflight.current=true;setBusy(true);setError('');const current=generation.current;try{const data=await adminApi('admin/ad-history?'+new URLSearchParams({id,...(cursor?{before:cursor}:{})}));if(current!==generation.current)return;setRows(old=>cursor?[...old,...data.rows]:data.rows);setNext(data.next);setLoaded(true);}catch(e){if(current===generation.current)setError(e.message);}finally{if(current===generation.current){setBusy(false);inflight.current=false;}}}
 useEffect(()=>{if(open&&!loaded&&!busy&&!error)read();},[open,loaded,busy,error,id,version]);
 return <details className="ad-history" onToggle={e=>setOpen(e.currentTarget.open)}><summary>投放操作历史与差异</summary><p>按操作时保存的快照核对；旧记录缺少原因或快照时保持未知。地址仅展示，不自动加载历史素材。</p>{error&&<p role="alert">读取失败：{error} <button type="button" className="text-button" onClick={()=>read(loaded?next:null)}>重试</button></p>}{busy&&<p role="status">正在读取历史…</p>}{loaded&&!rows.length&&<p>暂无已记录的投放操作。</p>}{rows.map(r=><details key={r.id} className="ad-history-event"><summary>{{publish:'发布',pause:'暂停',resume:'恢复投放',offline:'下架',rollback:'恢复历史版本'}[r.action]} · 版本 {r.version??'未知'} · {r.actor} · {updatedDisplay(r.created_at)}</summary><p>原因：{r.reason||'历史未记录'}</p><AdSnapshotDiff before={r.before} after={r.after} known={r.snapshots_known}/><Link aria-disabled={locked||undefined} onClick={e=>{if(locked)e.preventDefault();}} title={locked?'请先保存或取消修改后查看报表':undefined} href={'/admin/reports?'+new URLSearchParams({view:'promotions',placement_id:id,range:'30',...(r.after?.creative_version?{creative_version:r.after.creative_version}:{})})}>查看该广告近30天报表{r.after?.creative_version?'（此素材版本）':''}</Link></details>)}{next&&<button type="button" className="button" disabled={busy} onClick={()=>read(next)}>加载更早记录</button>}</details>;
}
