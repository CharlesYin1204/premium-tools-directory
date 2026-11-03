'use client';
import {useRef,useState} from 'react';
import {Megaphone,X} from 'lucide-react';
export default function SiteAnnouncements({items,title}){
 const dialog=useRef(null),[selected,setSelected]=useState(null);
 if(!items.length)return null;
 function open(item){setSelected(item);dialog.current.showModal();}
 return <><section className="portal-notices" aria-label={title}><Megaphone size={17}/><strong>{title}</strong><div>{items.map(item=>item.body?.trim()?<button type="button" key={item.id} onClick={()=>open(item)} aria-haspopup="dialog">{item.title}<span>查看公告 ›</span></button>:<a href={item.url} key={item.id}>{item.title}</a>)}</div></section><dialog ref={dialog} className="site-notice-dialog" aria-labelledby="site-notice-title" onClick={e=>{if(e.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.current.close();}}}><header><span>站点公告</span><button type="button" aria-label="关闭公告" onClick={()=>dialog.current.close()}><X size={20}/></button></header><h2 id="site-notice-title">{selected?.title}</h2><div className="site-notice-body">{selected?.body}</div><footer>{selected?.url&&<a className="button" href={selected.url}>查看相关内容</a>}<button className="button primary" onClick={()=>dialog.current.close()}>我知道了</button></footer></dialog></>;
}
