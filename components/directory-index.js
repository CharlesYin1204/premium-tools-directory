'use client';
import {useEffect,useState} from 'react';

export default function DirectoryIndex({categories}){
 const [active,setActive]=useState('');
 useEffect(()=>{
  let frame;
  const update=()=>{
   frame=undefined;
   const groups=categories.map(c=>document.getElementById('directory-'+c.slug)).filter(Boolean);
   const current=groups.find(el=>{const rect=el.getBoundingClientRect();return rect.top<=100&&rect.bottom>100;});
   setActive(current?.id||'');
  };
  const schedule=()=>{if(frame===undefined)frame=requestAnimationFrame(update);};
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[categories]);
 return <nav className="directory-index" aria-label="首页分类索引"><strong>全部分类</strong>{categories.map(c=>{
  const id='directory-'+c.slug;
  return <a key={c.id} href={'#'+id} aria-current={active===id?'location':undefined} onClick={e=>{
   if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
   document.getElementById(id)?.focus({preventScroll:true});
  }}>{c.name}<span>{c.count}</span></a>;
 })}</nav>;
}
