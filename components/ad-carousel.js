'use client';
import {Children,useEffect,useRef,useState} from 'react';

export default function AdCarousel({children}) {
 const slides=Children.toArray(children),[index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[reduced,setReduced]=useState(false),root=useRef(null),touch=useRef(null);
 useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(mq.matches);update();mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update);},[]);
 const active=index%Math.max(1,slides.length),playing=!paused&&!hover&&!focused&&!reduced;
 useEffect(()=>{
  if(!playing||slides.length<2)return;
  const timer=setInterval(()=>{const box=root.current?.getBoundingClientRect();if(document.visibilityState==='visible'&&box?.width&&box.bottom>0&&box.top<innerHeight)setIndex(n=>(n+1)%slides.length);},6000);
  return()=>clearInterval(timer);
 },[playing,slides.length]);
 if(!slides.length)return null;
 function move(step){setIndex(n=>(n+step+slides.length)%slides.length);}
 return <div ref={root} className="ad-carousel" role="region" aria-label="首页广告轮播" aria-roledescription="轮播" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}} onTouchStart={e=>{touch.current={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};}} onTouchEnd={e=>{if(!touch.current)return;const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)){setPaused(true);move(dx<0?1:-1);}touch.current=null;}}>
  <div className="ad-carousel-slide" role="group" aria-roledescription="幻灯片" aria-label={`${active+1} / ${slides.length}`} key={active}>{slides[active]}</div>
  {slides.length>1&&<div className="ad-carousel-controls"><button aria-label="上一张广告" onClick={()=>move(-1)}>‹</button><div className="ad-carousel-dots">{slides.map((_,i)=><button key={i} aria-label={`切换到第 ${i+1} 张广告`} aria-pressed={active===i} onClick={()=>setIndex(i)}><span/></button>)}</div><span aria-live={playing?'off':'polite'}>{active+1} / {slides.length}</span><button aria-label="下一张广告" onClick={()=>move(1)}>›</button>{!reduced&&<button onClick={()=>setPaused(p=>!p)} aria-label={paused?'播放广告轮播':'暂停广告轮播'}>{paused?'▶':'Ⅱ'}</button>}</div>}
 </div>;
}
