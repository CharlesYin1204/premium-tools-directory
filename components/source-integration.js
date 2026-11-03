'use client';
import {useEffect,useState} from 'react';
import {adminApi} from '../lib/admin-api';
import Icon from './icons';
import Link from 'next/link';
import AdminPagination from './admin-pagination';
import {adminPage} from '../lib/admin-pagination';
const call=()=>adminApi('admin/sync');
const states={queued:'等待执行',running:'正在同步',paused:'等待后台继续',completed:'已完成',failed:'失败'};
export default function SourceIntegration({initial,resources}){
 const [status,setStatus]=useState(initial),[error,setError]=useState(''),[loading,setLoading]=useState(false);const synced=resources.filter(item=>item.kind==='contents'&&item.source_system&&!item.is_demo).sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
 const refresh=async()=>{setLoading(true);try{setStatus(await call());setError('');}catch(e){setError(e.message);}finally{setLoading(false);}};
 useEffect(()=>{if(!initial)refresh();},[]);
 useEffect(()=>{if(!status?.jobs?.some(job=>['queued','running'].includes(job.state)))return;const timer=setInterval(refresh,5000);return()=>clearInterval(timer);},[status?.jobs]);
 const [contentPage,setContentPage]=useState(1),[contentSize,setContentSize]=useState(20),[jobPage,setJobPage]=useState(1),[jobSize,setJobSize]=useState(20);const cp=adminPage(synced.length,String(contentPage),contentSize),jobs=status?.jobs||[],jp=adminPage(jobs.length,String(jobPage),jobSize);
 const latest=status?.jobs?.[0];return <>
  <section className="integration-banner"><span className="integration-icon"><Icon name="refresh" size={30}/></span><div><span className="eyebrow">BACKGROUND SYNC</span><h2>内容由服务端自动同步。</h2><p>接口、鉴权、频率与发布规则由后台任务统一管理；这里直接查看同步结果和运行状态。</p></div><span className={'badge '+(status?.configured?'published':'pending')}>{status?.configured?'服务已配置':'等待服务端配置'}</span></section>
  {error&&<p className="error-message" role="alert">{error}</p>}
  <section className="sync-summary-grid"><article><span>已同步内容</span><strong>{synced.length}</strong><small>真实来源记录</small></article><article><span>最近任务</span><strong>{latest?states[latest.state]||latest.state:'暂无'}</strong><small>{latest?.updated_at||latest?.created_at||'尚未执行'}</small></article><article><span>执行进程</span><strong>{status?.worker?.available?'在线':'等待心跳'}</strong><small>页面关闭后仍由服务端执行</small></article></section>
  <section className="panel"><div className="panel-title"><div><h2>已同步视频</h2><p>只展示已进入本站内容库的真实同步记录，可前往内容管理完成审核与发布。</p></div><div className="form-actions"><button className="button" disabled={loading} onClick={refresh}><Icon name="refresh" size={15}/>{loading?'刷新中…':'刷新状态'}</button><Link className="button primary" href="/admin/video-library">管理视频</Link></div></div>{synced.length?<div className="table-wrap"><table><thead><tr><th>标题</th><th>来源系统</th><th>来源编号</th><th>内容状态</th><th>最后更新</th><th>操作</th></tr></thead><tbody>{synced.slice(cp.start,cp.end).map(item=><tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.source_system}</td><td>{item.source_id||'—'}</td><td><span className={'badge '+item.status}>{item.has_published?'已发布':item.status==='candidate'?'候选':'草稿'}</span></td><td>{item.updated_at?.slice(0,16)}</td><td><Link className="text-button" href={'/admin/video-library?q='+encodeURIComponent(item.title)}>查看内容</Link></td></tr>)}</tbody></table></div>:<div className="empty admin-empty"><span className="empty-orbit"><Icon name="inbox" size={26}/></span><h3>暂未同步到视频</h3><p>服务端任务取得内容后会直接出现在这里，无需在页面填写接口参数。</p></div>}<AdminPagination total={synced.length} page={cp.page} size={contentSize} onPage={setContentPage} onSize={n=>{setContentSize(n);setContentPage(1);}} label="每页同步内容数量"/></section>
  <section className="panel"><div className="panel-title"><div><h2>后台任务记录 · 最近 100 条</h2><p>接口参数不在管理界面暴露；异常由服务端日志与任务状态定位。</p></div></div>{status?.jobs?.length?<div className="table-wrap"><table><thead><tr><th>任务编号</th><th>内容类型</th><th>状态</th><th>处理结果</th><th>异常</th></tr></thead><tbody>{jobs.slice(jp.start,jp.end).map(job=>{const counts=typeof job.counts==='string'?JSON.parse(job.counts):job.counts||{};return <tr key={job.id}><td>{job.id}</td><td>{job.type==='video'?'视频':'漫画'}</td><td>{states[job.state]||job.state}</td><td>新增 {counts.created||0} · 更新 {counts.updated||0} · 跳过 {counts.skipped||0}</td><td>{job.error_message||'—'}</td></tr>;})}</tbody></table></div>:<div className="empty admin-empty"><h3>尚无任务记录</h3><p>服务端同步任务执行后会记录在这里。</p></div>}<AdminPagination total={jobs.length} page={jp.page} size={jobSize} onPage={setJobPage} onSize={n=>{setJobSize(n);setJobPage(1);}} label="每页任务数量"/></section>
 </>;
}
