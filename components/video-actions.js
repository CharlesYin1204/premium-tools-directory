'use client';
import {useState} from 'react';
import Icon from './icons';

export default function VideoActions({title}){
 const [copied,setCopied]=useState(false);
 async function share(){
  if(navigator.share){try{await navigator.share({title,url:location.href});return;}catch(error){if(error?.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(location.href);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{setCopied(false);}
 }
 return <button type="button" className="watch-share" onClick={share} aria-live="polite"><Icon name="share" size={17}/>{copied?'链接已复制':'分享影片'}</button>;
}
