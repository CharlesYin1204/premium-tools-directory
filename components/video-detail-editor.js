'use client';
import {videoDetailConfig} from '../lib/video-detail-config';
import {rankingConfig} from '../lib/recommendations';
import RecommendationPreview from './recommendation-preview';
export default function VideoDetailEditor({value,onChange,disabled,attrs}){
 const config=videoDetailConfig({video_detail:value});const change=(key,v)=>onChange({...config,[key]:v});
 const ranking=rankingConfig(config),rankChange=(key,v)=>change('ranking',{...ranking,[key]:v});
 return <div {...attrs} role="group" tabIndex={-1} aria-label="视频页面配置" className="config-item video-detail-config"><div className="config-fields">
  <label className="toggle-label"><input type="checkbox" checked={config.enabled} disabled={disabled} onChange={e=>change('enabled',e.target.checked)}/>显示相关推荐</label>
  <label>推荐数量<input type="number" min="1" max="12" step="1" required value={config.limit} disabled={disabled} onChange={e=>change('limit',e.target.value===''?'':Number(e.target.value))}/></label>
  <label>推荐标题<input value={config.title} maxLength={60} required disabled={disabled} onChange={e=>change('title',e.target.value)}/></label>
  <label>推荐说明<input value={config.note} maxLength={160} disabled={disabled} onChange={e=>change('note',e.target.value)}/></label>
 </div><p className="muted">推荐仅使用已发布视频，排除当前作品、重复来源、撤权和人工排除项。实际内容不足时按已有数量展示；关闭后播放区自动占满宽度。</p>
 <h3>自然推荐排序规则</h3><div className="config-fields">
  {[['tag_weight','同标签权重'],['category_weight','同分类权重'],['recency_weight','新鲜度权重']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" max="100" step="1" required value={ranking[key]} disabled={disabled} onChange={e=>rankChange(key,e.target.value===''?'':Number(e.target.value))}/></label>)}
  <label>新鲜度时间窗（天）<input type="number" min="1" max="365" step="1" required value={ranking.recency_days} disabled={disabled} onChange={e=>rankChange('recency_days',e.target.value===''?'':Number(e.target.value))}/></label>
  <label>同分及不足时补足<select value={ranking.fallback} disabled={disabled} onChange={e=>rankChange('fallback',e.target.value)}><option value="recent">最近发布优先</option><option value="order">运营排序优先</option></select></label>
 </div><p className="muted">每个相同标签/分类按对应权重计分；新鲜度从发布时间起在所设天数内线性递减，超出为0。权重可为0，同分按补足方式排序，再以ID稳定排序。业务热度尚未接通，不提供虚假的热度权重。</p>
 <RecommendationPreview config={config} disabled={disabled}/></div>;
}
