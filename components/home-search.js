'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import AiDirectoryResults from './ai-directory-results';
import {Search,X} from 'lucide-react';
import {copy} from '../lib/site-config';
import {searchPublished} from '../lib/public-search';
import {EntryLink,Picture} from './public-client';

const HomeSearch = createContext(null);
export function HomeSearchProvider({data,children}) {
 const params=useSearchParams(),query=(params.get('q')||'').trim().slice(0,500),mode=params.get('mode')==='ai'?'ai':'normal';
 function search(value,nextMode=mode) {
  value=value.slice(0,nextMode==='ai'?500:50);
  const url=new URL(location.href);url.searchParams.set('mode',nextMode);
  if(value)url.searchParams.set('q',value);else url.searchParams.delete('q');
  if(url.href!==location.href)window.history.pushState(null,'',url);
  requestAnimationFrame(()=>document.getElementById(value?'home-search-results':'home-search-input')?.focus());
 }
 return <HomeSearch.Provider value={data?{data,query,mode,search}:null}>{children}</HomeSearch.Provider>;
}
export function SiteSearchForm({site,compact=false}) {
 const context=useContext(HomeSearch),params=useSearchParams(),[value,setValue]=useState(context?.query||params.get('q')||''),[mode,setMode]=useState(context?.mode||(params.get('mode')==='ai'?'ai':'normal'));
 useEffect(()=>setMode(context?.mode||(params.get('mode')==='ai'?'ai':'normal')),[context?.mode,params]);
 useEffect(()=>setValue(context?.query||params.get('q')||''),[context?.query,params]);
 function submit(event) {
  const form=event.currentTarget;
  if(form.closest('.settings-modules-preview,.settings-nav-preview')){event.preventDefault();return;}
  const q=value.trim();
  if(!q){event.preventDefault();form.q.focus();return;}
  setValue(q);form.q.value=q;
  if(context){event.preventDefault();context.search(q,mode);}
 }
 return <form className={'search-box '+(compact?'header-search-form':'large')} action="/" role="search" aria-label="站内搜索" onSubmit={submit}>
  <select name="mode" aria-label="搜索方式" value={mode} onChange={e=>setMode(e.target.value)}><option value="normal">普通搜索</option><option value="ai">AI 搜索</option></select><Search size={20}/><input id="home-search-input" name="q" type="search" aria-label="搜索站点、公司或内容" value={value} onChange={e=>setValue(e.target.value)} required maxLength={mode==='ai'?500:50} placeholder={mode==='ai'?'描述你想找的内容或用途…':copy(site,'search_placeholder')}/>
  <button className="button primary" type="submit">{copy(site,'search_button')}</button>
 </form>;
}
export function HomeSearchResults() {
 const context=useContext(HomeSearch),[type,setType]=useState('all'),[limit,setLimit]=useState(12),panel=useRef(null);
 const query=context?.query||'';
 useEffect(()=>{setType('all');setLimit(12);if(query){panel.current?.focus({preventScroll:true});panel.current?.scrollIntoView({block:'nearest'});}},[query]);
 if(!context||!query)return null;
 if(context.mode==='ai')return <section className="portal-panel home-search-results" id="home-search-results" ref={panel} tabIndex={-1} aria-label="AI 搜索结果"><div className="portal-panel-heading"><h2>AI 搜索：{query}</h2><button onClick={()=>context.search('')}><X size={16}/>收起结果</button></div><AiDirectoryResults key={query} query={query}/></section>;
 const groups=searchPublished(context.data,query),total=groups.reduce((n,g)=>n+g.items.length,0);
 const items=groups.filter(g=>type==='all'||g.id===type).flatMap(g=>g.items.map(item=>({item,kind:g.id,label:g.label})));
 return <section className="portal-panel home-search-results" id="home-search-results" ref={panel} tabIndex={-1} aria-label="站内搜索结果">
  <div className="portal-panel-heading"><h2>“{query}” 的搜索结果</h2><button onClick={()=>context.search('')}><X size={16}/>收起结果</button></div>
  <div className="home-search-filters" aria-label="搜索结果类型">{[{id:'all',label:'全部',count:total},...groups.map(g=>({...g,count:g.items.length}))].map(g=><button key={g.id} aria-pressed={type===g.id} onClick={()=>{setType(g.id);setLimit(12);}}>{g.label}<span>{g.count}</span></button>)}<span role="status">共 {items.length} 项</span></div>
  {items.length?<div className="home-search-grid">{items.slice(0,limit).map(({item,kind,label})=>{
   const children=<><Picture src={item.icon_url||item.cover_url} alt=""/><span><strong>{item.name||item.title}</strong><small>{item.description||item.summary}</small></span><em>{label}</em></>;
   return kind==='entries'?<EntryLink className="home-search-item" key={item.id} entry={item}>{children}</EntryLink>:<Link className="home-search-item" key={item.id} href={'/'+item.type+'/'+item.slug}>{children}</Link>;
  })}</div>:<p className="home-search-empty">没有找到相关{type==='all'?'内容':groups.find(g=>g.id===type)?.label}，试试更短的关键词或其他分类。</p>}
  {items.length>limit&&<button className="button" onClick={()=>setLimit(n=>n+12)}>显示更多（还有 {items.length-limit} 项）</button>}
 </section>;
}
