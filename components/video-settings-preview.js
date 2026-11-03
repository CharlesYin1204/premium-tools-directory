'use client';
import {useState} from 'react';
import VideoDetail from './video-detail';
import {RecommendationExplanation} from './recommendation-preview';
import {videoDetailConfig} from '../lib/video-detail-config';
export default function VideoSettingsPreview({data,site,mobile}){
 const items=data.contents.filter(c=>c.type==='video');const [id,setId]=useState('');
 const content=items.find(c=>c.id===id)||items[0];const [at]=useState(()=>Date.now());
 return <section className="settings-video-preview"><h2>视频页面预览</h2>{content?<><label>选择已发布视频<select value={content.id} onChange={e=>setId(e.target.value)}>{items.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label><details className="recommendation-preview"><summary>查看自然推荐规则与排序依据</summary><RecommendationExplanation content={content} data={data} config={videoDetailConfig(site)} at={at}/></details><div className={'public-site '+(mobile?'preview-mobile':'')} onClickCapture={e=>{if(e.target.closest('a')){e.preventDefault();e.stopPropagation();}}}><VideoDetail content={content} data={{...data,site}} preview recommendationAt={at}/></div></>:<p>尚无已发布视频，发布视频后可预览此配置。</p>}</section>;
}
