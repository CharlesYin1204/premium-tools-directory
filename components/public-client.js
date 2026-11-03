'use client';
import {useEffect,useRef,useState} from 'react';
import {observeImpressions} from '../lib/impression-observer';
import {usePathname,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Icon from './icons';
import {copy,siteConfig} from '../lib/site-config';
import SiteMark from './site-mark';
import {SiteSearchForm} from './home-search';
import ComicPage from './comic-page';
import {activeNavigation} from '../lib/category-navigation';
function uuid(){return typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');}
function session(){let s=sessionStorage.getItem('bd_visit');if(!s){s=uuid();sessionStorage.setItem('bd_visit',s);}return s;}
let pageTracking=null;
const proofKey=(entry,placement,version)=>JSON.stringify([entry,placement||'',String(version||'')]);
export async function send(name,extra={}){try{if(new URLSearchParams(location.search).has('preview'))return null;const response=await fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_id:uuid(),event_name:name,occurred_at:new Date().toISOString(),session_id:session(),page:location.pathname,page_view_id:pageTracking?.page===location.pathname?pageTracking.id:undefined,device:innerWidth<768?'h5':'pc',channel:new URLSearchParams(location.search).get('channel')||'direct',is_test:navigator.webdriver,...extra}),keepalive:true});return response.ok?await response.json():null;}catch{return null;}}
export function Tracker({contentId,enabled}){
 const path=usePathname(),params=useSearchParams();
 useEffect(()=>{
  if(!enabled||params.has('preview'))return;
  const tracking={id:uuid(),page:path,proofs:new Map()};pageTracking=tracking;let active=true;
  const pageSaved=send('page_view',{event_id:tracking.id,page_view_id:tracking.id});
  if(contentId)send('content_view',{content_id:contentId});if((path==='/search'||path==='/')&&params.get('q')?.trim())send('search_submit');
  const stop=observeImpressions({onImpression:async extra=>{
   const occurred_at=new Date().toISOString();await pageSaved;
   if(!active)return;
   const receipt=await send('entry_impression',{...extra,occurred_at,page_view_id:tracking.id});
   if(active&&receipt?.impression_id&&String(receipt.creative_version||'')===String(extra.creative_version||''))tracking.proofs.set(proofKey(extra.entry_id,extra.placement_id,extra.creative_version),receipt.impression_id);
  }});
  return ()=>{active=false;stop();if(pageTracking===tracking)pageTracking=null;};
 },[path,params,contentId,enabled]);return null;
}
export function Nav({site}){const path=usePathname();const [open,setOpen]=useState(false);const toggle=useRef();useEffect(()=>{setOpen(false);},[path]);return <header className="public-header"><div className="header-inner"><Link href="/" className="brand"><SiteMark src={site.logo_url}/><span>{site.name}<small>{copy(site,'brand_tagline')}</small></span></Link><nav aria-label="主导航" className={open?'nav-links open':'nav-links'} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);toggle.current?.focus();}}}>{siteConfig(site).navigation.filter(i=>i.enabled).map(({href,label,icon})=><Link key={href} href={href} className={activeNavigation(path,href)?'active':''} aria-current={path===href?'page':activeNavigation(path,href)?'location':undefined}><Icon name={icon} size={17}/>{label}</Link>)}</nav><SiteSearchForm site={site} compact/><button ref={toggle} className="icon-button mobile-menu" aria-label={open?'关闭菜单':'打开菜单'} aria-expanded={open} onClick={()=>setOpen(!open)}><Icon name={open?'close':'menu'}/></button></div></header>;}
export function SearchBox({site}){return <SiteSearchForm site={site}/>;}
export function Picture({src,alt='',className='',style}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return src&&!failed?<img className={className} style={style} src={src} alt={alt} loading="lazy" onError={()=>setFailed(true)}/>:<span className={'image-placeholder '+className} role="img" aria-label={alt||'暂无图片'}><Icon name="image" size={26}/></span>;}
export function RecommendationLink({item,token,children,...rest}){
 const path=usePathname();
 const prepare=e=>{if(!token)return;try{const u=new URL(e.currentTarget.href);u.searchParams.set('event_id',uuid());u.searchParams.set('session_id',session());u.searchParams.set('device',innerWidth<768?'h5':'pc');u.searchParams.set('channel',new URLSearchParams(location.search).get('channel')||'direct');if(pageTracking?.page===path)u.searchParams.set('page_view_id',pageTracking.id);if(navigator.webdriver)u.searchParams.set('test','1');e.currentTarget.href=u.pathname+u.search;}catch{}};
 return <a {...rest} href={token?'/r/'+encodeURIComponent(item.id)+'?'+new URLSearchParams({context:token}):'/video/'+item.slug} onClick={prepare} onAuxClick={e=>{if(e.button===1)prepare(e);}} onContextMenu={prepare}>{children}</a>;
}
export function LandingVisit({href,children,...rest}){
 const prepare=e=>{try{const u=new URL(e.currentTarget.href);const defaults={event_id:uuid(),session_id:session(),device:innerWidth<768?'h5':'pc',page:location.pathname,channel:'direct'};for(const [key,value] of Object.entries(defaults))if(!u.searchParams.has(key))u.searchParams.set(key,value);if(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1)u.searchParams.set('ipad','1');if(navigator.webdriver)u.searchParams.set('test','1');e.currentTarget.href=u.pathname+u.search;}catch{}};
 return <a {...rest} href={href} onClick={prepare} onAuxClick={e=>{if(e.button===1)prepare(e);}} onContextMenu={prepare}>{children}</a>;
}
export function EntryLink({entry,placement,contentId,children,...rest}){
 const path=usePathname();const context=new URLSearchParams({page:path});if(placement){context.set('placement',placement.id);if(placement.creative_version)context.set('creative_version',String(placement.creative_version));}if(contentId)context.set('content',contentId);
 const href=`/go/${entry.id}?${context}`;
 const prepare=e=>{try{const u=new URL(e.currentTarget.href);u.searchParams.delete('page_view_id');u.searchParams.delete('impression_id');if(pageTracking?.page===path){u.searchParams.set('page_view_id',pageTracking.id);const proof=pageTracking.proofs.get(proofKey(entry.id,placement?.id,placement?.creative_version));if(proof)u.searchParams.set('impression_id',proof);}if(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1)u.searchParams.set('ipad','1');u.searchParams.set('event_id',uuid());u.searchParams.set('session_id',session());u.searchParams.set('device',innerWidth<768?'h5':'pc');u.searchParams.set('channel',new URLSearchParams(location.search).get('channel')||'direct');if(navigator.webdriver)u.searchParams.set('test','1');e.currentTarget.href=u.pathname+u.search;}catch{}};
 return <a href={href} target="_blank" rel="noopener noreferrer" data-entry={entry.id} data-placement={placement?.id||''} data-creative-version={placement?.creative_version||''} {...rest} onClick={prepare} onAuxClick={e=>{if(e.button===1)prepare(e);}} onContextMenu={prepare}>{children}</a>;
}
export function Video({content,seconds=3,preview=false}){
 const [error,setError]=useState(''),[key,setKey]=useState(0);
 const video=useRef(null),timer=useRef(null),played=useRef(0),previous=useRef(0),effective=useRef(false);
 const stopWaiting=()=>{clearTimeout(timer.current);timer.current=null;};
 const waitForPlayback=()=>{
  if(timer.current||!video.current||video.current.paused||video.current.ended)return;
  timer.current=setTimeout(()=>{
   timer.current=null;const player=video.current;
   if(!player||player.paused||player.ended)return;
   player.pause();setError(navigator.onLine===false?'网络已断开，请恢复连接后重新加载':'视频加载超时，请检查网络后重新加载');
  },15000);
 };
 const mediaError=player=>{stopWaiting();setError(({1:'播放已中止',2:'媒体加载失败，请检查网络或稍后重试',3:'媒体无法解码，请尝试其他浏览器',4:'播放地址不可用、已过期或格式不受支持'})[player?.error?.code]||'暂时无法播放');};
 useEffect(()=>{if(video.current?.error)mediaError(video.current);return ()=>clearTimeout(timer.current);},[key,content.id]);
 useEffect(()=>{
  const player=video.current;let disposed=false,hls;
  const isHls=content.media_format==='hls'||content.media_format!=='file'&&/\.m3u8(?:[?#]|$)/i.test(content.play_url||'');
  const nativeHls=player?.canPlayType('application/vnd.apple.mpegurl')&&/Safari\//.test(navigator.userAgent)&&!/Chrome|Chromium|Edg\//.test(navigator.userAgent);
  if(player&&isHls&&!nativeHls){
   import('hls.js').then(({default:Hls})=>{if(disposed)return;if(!Hls.isSupported()){setError('当前浏览器不支持此视频格式，请换用其他浏览器');return;}hls=new Hls({manifestLoadingMaxRetry:2,levelLoadingMaxRetry:2,fragLoadingMaxRetry:2});hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal){stopWaiting();player.pause();setError(data.type===Hls.ErrorTypes.NETWORK_ERROR?'视频连接失败或跨域访问受限，请检查来源后重新加载':'视频无法解码，请检查媒体格式');hls.destroy();}});hls.loadSource(content.play_url);hls.attachMedia(player);}).catch(()=>{if(!disposed)setError('播放器加载失败，请重新加载');});
  }else if(player){player.src=content.play_url||'';}
  return()=>{disposed=true;hls?.destroy();if(player){player.pause();player.removeAttribute('src');player.load();}};
 },[key,content.id,content.play_url,content.media_format]);
 const track=(event)=>{if(!preview)send(event,{content_id:content.id});};
 const retry=()=>{stopWaiting();previous.current=0;setError('');setKey(n=>n+1);};
 return <div className="player"><video ref={video} key={key} controls playsInline preload="metadata" poster={content.cover_url}
  onPlay={()=>{track('video_start');waitForPlayback();}}
  onWaiting={waitForPlayback}
  onStalled={()=>{if(video.current&&!video.current.paused)waitForPlayback();}}
  onPlaying={stopWaiting}
  onPause={stopWaiting}
  onSeeking={()=>{previous.current=0;if(video.current&&!video.current.paused)waitForPlayback();}}
  onTimeUpdate={e=>{const n=e.currentTarget.currentTime,delta=n-previous.current;if(delta>0&&delta<1){stopWaiting();played.current+=delta;}previous.current=n;if(!effective.current&&played.current>=seconds){effective.current=true;track('video_effective');}}}
  onEnded={()=>{stopWaiting();track('video_complete');}}
  onError={e=>mediaError(e.currentTarget)}
 />{error&&<div className="media-error" role="alert"><Icon name="alert"/><h3>{error}</h3><button className="button" onClick={retry}>重新加载</button></div>}{content.type!=='video'&&<span className="media-brand">{content.brand}</span>}</div>;
}
export function Reader({content}){const [chapter,setChapter]=useState(0),[page,setPage]=useState(0);const sent=useRef(false);const chapters=content.chapters||[];const current=chapters[chapter];if(!current)return <p>当前章节暂不可用，请返回详情。</p>;return <section className="reader"><div className="reader-toolbar"><label>选择章节<select value={chapter} onChange={e=>{setChapter(+e.target.value);setPage(0);}}>{chapters.map((c,i)=><option key={i} value={i}>{c.title}</option>)}</select></label><span>第 {page+1} / {current.pages.length} 页</span><span>{content.brand}</span></div><ComicPage key={`${content.id}-${chapter}-${page}`} src={current.pages[page]} alt={`${current.title} 第 ${page+1} 页`} onRead={()=>{if(!sent.current){sent.current=true;send('comic_read_start',{content_id:content.id});}}}/><div className="reader-toolbar"><button className="button" disabled={chapter===0&&page===0} onClick={()=>{if(page)setPage(page-1);else{setChapter(chapter-1);setPage(chapters[chapter-1].pages.length-1);}}}><Icon name="left"/>上一页</button><button className="button" disabled={chapter===0} onClick={()=>{setChapter(chapter-1);setPage(0);}}>上一章</button><button className="button" disabled={chapter===chapters.length-1} onClick={()=>{setChapter(chapter+1);setPage(0);}}>下一章</button><button className="button primary" disabled={chapter===chapters.length-1&&page===current.pages.length-1} onClick={()=>{if(page<current.pages.length-1)setPage(page+1);else{setChapter(chapter+1);setPage(0);}}}>下一页<Icon name="right"/></button><a className="button" href="#content-details" onClick={()=>document.getElementById('content-details')?.focus({preventScroll:true})}>返回详情</a></div></section>;}

