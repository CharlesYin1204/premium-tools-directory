'use client';
import {useEffect,useRef,useState} from 'react';
import Icon from './icons';

export default function ComicPage({src,alt,onRead}){
 const [attempt,setAttempt]=useState(0),[status,setStatus]=useState('loading');
 const img=useRef(null),timer=useRef(null),read=useRef(onRead);read.current=onRead;
 const finish=ok=>{if(status==='timeout')return;clearTimeout(timer.current);setStatus(ok?'ready':'error');if(ok)read.current();};
 useEffect(()=>{
  setStatus('loading');
  if(img.current?.complete){finish(img.current.naturalWidth>0);return;}
  timer.current=setTimeout(()=>setStatus('timeout'),15000);
  return()=>clearTimeout(timer.current);
 },[src,attempt]);
 const failed=status==='error'||status==='timeout';
 return <div className="comic-page" aria-busy={status==='loading'}>
  {failed?<div className="empty" role="alert"><Icon name="image"/><h3>{status==='timeout'?'此页图片加载超时':'此页图片加载失败'}</h3><p>请检查网络后重试，也可以继续阅读其他页面。</p><button className="button" onClick={()=>{setStatus('loading');setAttempt(n=>n+1);}}>重试此页</button></div>:<>
   {status==='loading'&&<p className="comic-loading" role="status">正在加载本页…</p>}
  </>}
  <img ref={img} key={attempt} src={src} alt={alt} hidden={failed} onLoad={()=>finish(true)} onError={()=>finish(false)}/>
 </div>;
}
