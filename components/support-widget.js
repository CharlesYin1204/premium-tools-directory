'use client';
import {useEffect,useRef,useState,useId} from 'react';
import {copy,supportHref} from '../lib/site-config';
import Icon from './icons';
import {Picture} from './public-client';
export default function SupportWidget({site,preview=false}){
 const panelId=useId(),panel=useRef(null),root=useRef(null),button=useRef(null),timer=useRef(null),focusOnOpen=useRef(false);
 const [open,setOpen]=useState(false),pinned=useRef(false);
 const channels=(site.support_channels||[]).filter(c=>c.enabled&&(c.value||c.qr_url));
 const cancelClose=()=>clearTimeout(timer.current);
 const close=(restore=false)=>{cancelClose();pinned.current=false;setOpen(false);if(restore)button.current?.focus();};
 const leave=()=>{cancelClose();timer.current=setTimeout(()=>{if(!pinned.current&&!root.current?.contains(document.activeElement))setOpen(false);},180);};
 const hover=()=>{cancelClose();if(!root.current?.closest('.preview-viewport.mobile')&&window.matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)').matches){focusOnOpen.current=false;setOpen(true);}};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(open&&focusOnOpen.current){panel.current?.querySelector('button,a[href]')?.focus();focusOnOpen.current=false;}},[open]);
 useEffect(()=>{if(!open)return;const dismiss=e=>{if(e.type==='keydown'&&e.key==='Escape')close(true);else if(e.type==='pointerdown'&&!root.current?.contains(e.target))close();};document.addEventListener('keydown',dismiss);document.addEventListener('pointerdown',dismiss);return()=>{document.removeEventListener('keydown',dismiss);document.removeEventListener('pointerdown',dismiss);};},[open]);
 if(!site.support_enabled||!channels.length)return null;
 return <aside ref={root} className={'support-widget'+(preview?' support-preview':'')} aria-label={copy(site,'support_title')} onMouseEnter={hover} onMouseLeave={leave} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){pinned.current=false;leave();}}}>
  <button ref={button} className="support-toggle" aria-expanded={open} aria-controls={open?panelId:undefined} onClick={()=>{if(open&&pinned.current){close();return;}pinned.current=true;focusOnOpen.current=true;cancelClose();if(open){panel.current?.querySelector('button,a[href]')?.focus();focusOnOpen.current=false;}else setOpen(true);}}><Icon name="users" size={25}/><span>{copy(site,'support_button')}</span></button>
  {open&&<section ref={panel} className="support-panel" id={panelId} aria-label={copy(site,'support_title')}>
   <div className="support-heading"><strong>{copy(site,'support_title')}</strong><button className="icon-button" aria-label="关闭客服" onClick={()=>close(true)}><Icon name="close" size={18}/></button></div>
   <p>{copy(site,'support_note')}</p>
   <div className="support-channels">{channels.map((c,i)=><div key={i} className={'support-channel'+(c.qr_url?' has-qr':'')}>
    {c.qr_url&&<Picture src={c.qr_url} alt={c.label+'联系二维码'}/>}
    <div className="support-channel-copy">{c.value?<a href={supportHref(c)} target={['email','phone'].includes(c.type)?undefined:'_blank'} rel="noopener noreferrer" onClick={preview?e=>e.preventDefault():undefined}><span>{c.label}</span><Icon name="external" size={16}/></a>:<strong>{c.label}</strong>}{c.note&&<small>{c.note}</small>}</div>
   </div>)}</div>
  </section>}
 </aside>;
}
