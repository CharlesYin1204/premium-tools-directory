'use client';
import {useState} from 'react';
import {ChevronDown,Search,RotateCcw} from 'lucide-react';
import {statuses} from '../lib/catalog';
import {videoSourceKey} from '../lib/video-library';
export const videoFilterKeys=['q','primary','secondary','status','source','region','language','tag','director','actors','min_rating','max_rating','release_from','release_to'];
const advancedKeys=videoFilterKeys.slice(4);
export default function VideoLibraryFilters({applied,categories,items,onApply}){
 const [draft,setDraft]=useState(applied),[expanded,setExpanded]=useState(advancedKeys.some(k=>applied[k])),[error,setError]=useState('');
 const change=(key,value)=>{setError('');setDraft(d=>({...d,[key]:value,...(key==='primary'?{secondary:''}:{})}));};
 const input=(key,label,props={})=><label className="video-filter-field"><span>{label}</span><input name={key} value={draft[key]} onChange={e=>change(key,e.target.value)} {...props}/></label>;
 const active=videoFilterKeys.filter(k=>applied[k]).length,advanced=advancedKeys.filter(k=>draft[k]).length;
 const submit=e=>{e.preventDefault();if(draft.min_rating!==''&&draft.max_rating!==''&&Number(draft.min_rating)>Number(draft.max_rating)){setExpanded(true);setError('最低评分不能高于最高评分');return;}if(draft.release_from&&draft.release_to&&draft.release_from>draft.release_to){setExpanded(true);setError('上映开始日期不能晚于结束日期');return;}setError('');onApply(draft);};
 const reset=()=>{const empty=Object.fromEntries(videoFilterKeys.map(k=>[k,'']));setDraft(empty);setError('');onApply(empty);};
 return <form className="video-library-filters" aria-label="视频筛选" onSubmit={submit} onInvalidCapture={()=>setExpanded(true)}>
  <div className="video-filter-primary">
   {input('q','视频关键词',{placeholder:'输入标题、原名或视频 ID','aria-label':'视频关键词'})}
   <label className="video-filter-field"><span>一级分类</span><select aria-label="一级分类" value={draft.primary} onChange={e=>change('primary',e.target.value)}><option value="">全部一级分类</option>{categories.filter(c=>!c.parent_id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label className="video-filter-field"><span>二级分类</span><select aria-label="二级分类" value={draft.secondary} onChange={e=>change('secondary',e.target.value)}><option value="">全部二级分类</option>{categories.filter(c=>c.parent_id&&(!draft.primary||c.parent_id===draft.primary)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label className="video-filter-field"><span>视频状态</span><select aria-label="视频状态" value={draft.status} onChange={e=>change('status',e.target.value)}><option value="">全部状态</option>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  </div>
  <button type="button" className="video-filter-toggle" aria-expanded={expanded} aria-controls="video-advanced-filters" onClick={()=>setExpanded(!expanded)}>更多筛选{advanced>0&&<span className="video-filter-count">{advanced}</span>}<ChevronDown size={16} aria-hidden="true"/><small>地区、演员、评分与来源</small></button>
  <div id="video-advanced-filters" className="video-filter-advanced" hidden={!expanded}>
   {[['region','地区'],['language','语言'],['tag','标签'],['director','导演'],['actors','演员']].map(([key,label])=><div key={key}>{input(key,label,{placeholder:'输入'+label})}</div>)}
   <label className="video-filter-field"><span>来源站点</span><select name="source" value={draft.source} onChange={e=>change('source',e.target.value)}><option value="">全部来源</option>{[...new Map(items.filter(i=>videoSourceKey(i)).map(i=>[videoSourceKey(i),i])).entries()].map(([key,item])=><option key={key} value={key}>{item.source_site_name||item.source_system}{item.source_site_id?' · '+item.source_site_id:''}</option>)}</select></label>
   <fieldset className="video-filter-range"><legend>评分范围</legend><div>{input('min_rating','最低评分',{type:'number',min:0,max:10,step:'0.1',placeholder:'最低分'})}<span aria-hidden="true">—</span>{input('max_rating','最高评分',{type:'number',min:0,max:10,step:'0.1',placeholder:'最高分'})}</div></fieldset>
   <fieldset className="video-filter-range"><legend>上映日期</legend><div>{input('release_from','上映开始',{type:'date'})}<span aria-hidden="true">—</span>{input('release_to','上映结束',{type:'date'})}</div></fieldset>
  </div>
  {error&&<p className="error-message" role="alert">{error}</p>}
  <div className="video-filter-actions"><p>{active?`已应用 ${active} 项筛选`:'全部视频'}<span>修改条件后点击查询</span></p><div><button type="button" className="button" onClick={reset}><RotateCcw size={15} aria-hidden="true"/>重置</button><button type="submit" className="button primary"><Search size={15} aria-hidden="true"/>查询</button></div></div>
 </form>;
}
