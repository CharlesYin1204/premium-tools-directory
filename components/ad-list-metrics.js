'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {adminApi} from '../lib/admin-api';
import {adListMetrics} from '../lib/ad-list-metrics';
import {display} from '../lib/report-format';
export function useAdListMetrics(active,range){
 const [attempt,setAttempt]=useState(0),[state,setState]=useState(null);
 useEffect(()=>{setState(null);if(!active)return;let current=true;
  adminApi('admin/report?'+new URLSearchParams({range})).then(report=>{if(current)setState({range,report,rows:adListMetrics(report.promotions)});}).catch(error=>{if(current)setState({range,error:error.message});});
  return()=>{current=false;};
 },[active,range,attempt]);
 return {state:state?.range===range?state:null,retry:()=>{setState(null);setAttempt(n=>n+1);}};
}
export function AdMetricsSummary({state,range,onRange,retry}){
 return <section className="ad-list-metrics" aria-label="广告效果统计"><div><strong>广告效果</strong><label>统计时段<select aria-label="广告效果统计时段" value={range} onChange={e=>onRange(e.target.value)}>{[['today','今天'],['yesterday','昨天'],['7','近7天'],['30','近30天']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="button" onClick={retry}>刷新统计</button></div><p>按广告编号汇总全部历史素材版本、设备及资源性质，排除已标记测试与机器人记录。列表筛选仅改变广告集合；演示与历史性质未知数据不代表正式经营效果。CTR 为点击 ÷ 曝光，无曝光显示 —，不补造曝光或限制为100%。</p>{!state?<p role="status">正在读取统计…</p>:state.error?<p role="alert">统计暂不可用：{state.error}。列表操作仍可使用，请重试。</p>:<p>统计日期：{state.report.start} 至 {state.report.end}（上海时间） · 更新：{new Date(state.report.updated_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}</p>}</section>;
}
export function AdMetricsCells({state,id,range}){
 const value=state&&!state.error?(state.rows.get(id)||{impressions:0,clicks:0,ctr:null}):null;
 return <><td data-ad-metric="impressions">{value?value.impressions:state?.error?'不可用':'读取中'}</td><td data-ad-metric="clicks">{value?value.clicks:state?.error?'不可用':'读取中'}</td><td data-ad-metric="ctr">{value?display(value.ctr,'percent'):'—'}<small><Link href={'/admin/reports?'+new URLSearchParams({view:'promotions',range,placement_id:id})}>查看投放报表</Link></small></td></>;
}
