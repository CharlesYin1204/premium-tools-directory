'use client';
import {useState,useEffect,useRef} from 'react';
import {adminApi} from '../lib/admin-api';
import {recommendContents} from '../lib/recommendations';
import {videoDetailConfig,videoDetailError} from '../lib/video-detail-config';

export function RecommendationExplanation({content,data,config,at}){
 const proposed=recommendContents(content,data.contents,config,at),live=recommendContents(content,data.contents,videoDetailConfig(data.site),at);
 const positions=new Map(live.items.map((r,i)=>[r.item.id,i+1]));
 return <div className="recommendation-results" aria-live="polite">
  <p className="muted">{proposed.degradation}</p>
  <p>可用候选 {proposed.candidate_count} 条 · 当前规则展示 {proposed.items.length} 条。{config.enabled===false?'推荐开关已关闭，发布后隐藏推荐模块。':'排除当前作品、重复来源、撤权和人工排除的内容。'}</p>
  <small className="muted">规则签名 {proposed.rule_id}；配置随站点设置保存、发布和版本恢复。</small>
  {proposed.items.length>0?<ol className="recommendation-preview-list">{proposed.items.map((r,index)=><li key={r.item.id}><strong>{index+1}. {r.item.title}</strong>{r.item.is_demo&&<span className="badge">已有演示内容</span>}<p>线上位置：{positions.get(r.item.id)||'未展示'} → 本次预览：{index+1}</p><small>标签命中 {r.tagMatches}，分类命中 {r.categoryMatches}；规则得分 {r.score.toFixed(2)}（标签 {r.parts.tags.toFixed(2)} / 分类 {r.parts.categories.toFixed(2)} / 新鲜度 {r.parts.recency.toFixed(2)}）</small></li>)}</ol>:<p>当前规则没有可展示的推荐，不生成填充数据。</p>}
 </div>;
}
export default function RecommendationPreview({config,disabled}){
 const [snapshot,setSnapshot]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[id,setId]=useState('');
 const generation=useRef(0);useEffect(()=>()=>{generation.current++;},[]);
 async function refresh(){const current=++generation.current;setLoading(true);setError('');setSnapshot(null);try{const result=await adminApi('admin/preview?id=site');if(current===generation.current)setSnapshot({data:result.preview_context.public,at:Date.now()});}catch(e){if(current===generation.current)setError(e.message);}finally{if(current===generation.current)setLoading(false);}}
 const items=snapshot?.data.contents.filter(c=>c.type==='video')||[],content=items.find(c=>c.id===id)||items[0],problem=videoDetailError(config);
 return <section className="recommendation-preview" aria-label="自然推荐规则预览">
  <div className="config-item-head"><h3>真实内容排序预览</h3><button type="button" className="button" onClick={refresh} disabled={disabled||loading||!!problem}>{loading?'读取中…':snapshot?'刷新已发布样本':'按当前规则预览'}</button></div>
  <p className="muted">读取当前已发布内容，按表单中的规则即时计算；不保存、不发布、不计流量。样本读取失败时不沿用旧结果。</p>
  {problem&&<p role="status">请先修正规则：{problem}</p>}
  {error&&<p role="alert" className="error-message">{error}</p>}
  {snapshot&&!problem&&(content?<><label className="recommendation-sample">选择预览视频<select value={content.id} onChange={e=>setId(e.target.value)}>{items.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><small className="muted">样本读取时间：{new Date(snapshot.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}（上海）。修改权重后基于同一批样本重算；新内容变化请刷新。</small><RecommendationExplanation content={content} data={snapshot.data} config={config} at={snapshot.at}/></>:<p>尚无可用的已发布视频，请完成真实内容发布后再预览。</p>)}
 </section>;
}
