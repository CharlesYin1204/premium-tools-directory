'use client';
import Link from 'next/link';
import Icon from './icons';
import {labels} from '../lib/catalog';

export default function WorkOverview({resources,report,role,onRetry,requestId}){
 const kinds=Object.keys(labels).filter(k=>k!=='settings'||role==='super');
 const pending=kinds.map(kind=>({kind,count:resources.filter(r=>r.kind===kind&&r.status==='pending').length})).filter(r=>r.count);
 const candidates=resources.filter(r=>r.kind==='contents'&&r.status==='candidate').length;
 const shortcuts=[['entries','globe'],['contents','play'],['placements','compass'],['categories','layers']];
 return <>
 <section className="panel"><div className="panel-title"><div><h2>运营待办</h2><p>按资源类型处理，每个数量对应实际筛选结果。</p></div><Icon name="activity"/></div>
 {pending.map(({kind,count})=><Link key={kind} className="todo-row" href={'/admin/'+kind+(kind==='settings'?'':'?status=pending')}><span className="todo-icon"><Icon name="clock" size={19}/></span><span>{labels[kind]}待发布</span><strong>{count}</strong><Icon name="right" size={15}/></Link>)}
 <Link className="todo-row" href="/admin/contents?status=candidate"><span className="todo-icon"><Icon name="inbox" size={19}/></span><span>候选内容待整理</span><strong>{candidates}</strong><Icon name="right" size={15}/></Link>
 {!pending.length&&<p className="overview-note">暂无待发布资源，可以继续整理候选内容或维护已有资源。</p>}
 </section>
 <div className="overview-columns"><section className="panel"><div className="panel-title"><div><h2>常用入口</h2><p>快速进入日常维护。</p></div></div><div className="overview-shortcuts">{shortcuts.map(([kind,icon])=><Link key={kind} href={'/admin/'+kind}><span className="todo-icon"><Icon name={icon} size={20}/></span><strong>{labels[kind]}</strong><Icon name="right" size={15}/></Link>)}</div></section>
 <section className="panel"><div className="panel-title"><div><h2>状态与提醒</h2><p>查看当前需要关注的事项。</p></div><Icon name="alert"/></div><Link href="/admin/sync" className="integration-note"><Icon name="alert" size={17}/><span>内容来源待接入<small>正式接口未配置，查看接入状态</small></span><Icon name="right" size={15}/></Link>{!report?<p className="alert" role="status">统计与告警信息暂时无法读取，资源待办仍可使用。</p>:report.health_status==='unavailable'?<p className="alert" role="status">告警信息暂时无法读取，请刷新重试；访问统计仍正常显示。</p>:report.health.length?report.health.map(h=><div className="alert" key={h.name}>{h.message} · {h.updated_at}</div>):<p className="overview-note">暂无已记录的数据采集异常。内容源接入状态单独列示。</p>}</section></div>
 {!report?<section className="panel"><h2>近期数据摘要</h2><p className="overview-note">统计暂时无法读取，暂不显示访问数量。</p><button className="button" onClick={onRetry}>重试统计</button>{requestId&&<p className="overview-note">问题编号：{requestId}</p>}</section>:<section className="panel"><div className="panel-title"><div><h2>近期数据摘要</h2><p>{report.start} 至 {report.end} · Asia/Shanghai</p></div><Link className="button" href="/admin/reports?range=7">查看完整报表<Icon name="right" size={15}/></Link></div><div className="overview-metrics">{[['访问量 PV',report.metrics.pv,'entries'],['产品入口点击',report.metrics.clicks,'entries'],['视频有效播放',report.metrics.video,'contents'],['漫画阅读开启',report.metrics.comic,'contents']].map(([title,value,view])=><Link key={title} href={'/admin/reports?range=7&view='+view}><span>{title}</span><strong>{value??'—'}</strong></Link>)}</div><p className="overview-note">仅统计真实采集事件，默认排除预览、自动化测试与机器人。更新时间：{new Date(report.updated_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</p></section>}
 </>;
}
