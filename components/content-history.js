'use client';
import {useEffect,useState,useRef} from 'react';
import {adminApi} from '../lib/admin-api';
import {syncedContent} from '../lib/synced-content';
import {updatedDisplay} from '../lib/content-readiness';
import {statuses} from '../lib/catalog';
const actions={save:'保存草稿',restore_draft:'恢复为草稿',publish:'发布',offline:'下架',submit:'提交审核',baseline:'历史基线',rollback:'恢复发布版本',exclude:'人工排除',include:'恢复候选'};
export default function ContentHistory({id,canWrite,onClose,onRestored}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const active=useRef(true);
 const load=async(before)=>{const result=await adminApi('admin/content-history?id='+encodeURIComponent(id)+(before?'&before='+before:''));if(active.current)setData(previous=>({...result,versions:before?[...(previous?.versions||[]),...result.versions]:result.versions}));return result;};
 useEffect(()=>{active.current=true;setBusy(true);load().catch(e=>active.current&&setError(e.message)).finally(()=>active.current&&setBusy(false));return()=>{active.current=false;};},[id]);
 const restore=async(version)=>{if(busy||!data)return;if(!confirm('将此版本恢复为草稿？线上内容不变，当前授权与来源身份保留；需要另行审核发布。'))return;setBusy(true);setError('');try{await adminApi('admin/contents',{id,version:data.current.version,action:'restore_draft',history_version:version});await load();await onRestored();}catch(e){setError(e.message);}finally{if(active.current)setBusy(false);}};
 return <section className="panel" aria-label="视频版本历史"><div className="panel-title"><div><h3>视频版本历史</h3><p>{data?.current.title} · 每次后台保存及状态变更留档；上线前的编辑历史无法补造。</p></div><button className="button" disabled={busy} onClick={onClose}>关闭历史</button></div>{error&&<p className="error-message" role="alert">{error}</p>}{busy&&!data&&<p role="status">正在读取版本…</p>}
 {data&&<><div className="table-wrap"><table><thead><tr><th>版本</th><th>操作</th><th>状态</th><th>操作人</th><th>时间</th><th>恢复</th></tr></thead><tbody>{data.versions.map(v=><tr key={v.version}><td>{v.version}{v.version===data.current.version?' · 当前':''}</td><td>{actions[v.action]||v.action}</td><td>{statuses[v.status]||v.status}</td><td>{v.actor}</td><td>{updatedDisplay(v.created_at)}</td><td>{canWrite&&!syncedContent(data.current)&&v.version!==data.current.version?<button className="button" disabled={busy} onClick={()=>restore(v.version)}>恢复为草稿</button>:'—'}</td></tr>)}</tbody></table></div>{!data.versions.length&&<p>尚无历史记录，下一次保存后开始留档。</p>}{data.has_more&&<button className="button" disabled={busy} onClick={async()=>{setBusy(true);try{await load(data.next_before);}catch(e){setError(e.message);}finally{setBusy(false);}}}>加载更早版本</button>}{syncedContent(data.current)&&<p>此记录由来源系统维护；旧源快照只能查看，不能覆盖当前来源。</p>}</>}
 </section>;
}
