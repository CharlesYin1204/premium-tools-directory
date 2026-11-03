'use client';
import {useId,useState} from 'react';

export default function HomeTabs({label,tabs,children,className='',showTabs=true}){
 const id=useId(),[selected,setSelected]=useState(0);
 const choose=(index,list)=>{setSelected(index);list?.querySelectorAll('[role=tab]')[index]?.focus();};
 return <section className={'home-tab-module '+className} aria-label={label}>
  <div className="home-tab-heading"><h2>{label}</h2><div className="home-tab-list" hidden={!showTabs} role="tablist" aria-label={label} onKeyDown={e=>{
   let next;if(e.key==='ArrowRight')next=(selected+1)%tabs.length;else if(e.key==='ArrowLeft')next=(selected+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;
   e.preventDefault();choose(next,e.currentTarget);
  }}>{tabs.map((tab,i)=><button type="button" key={tab.id} id={`${id}-tab-${i}`} role="tab" aria-selected={selected===i} aria-controls={`${id}-panel-${i}`} tabIndex={selected===i?0:-1} onClick={()=>setSelected(i)}>{tab.label}{tab.count!=null&&<span>{tab.count}</span>}</button>)}</div></div>
  {tabs.map((tab,i)=><div key={tab.id} id={`${id}-panel-${i}`} role="tabpanel" aria-labelledby={showTabs?`${id}-tab-${i}`:undefined} aria-label={!showTabs?label:undefined} tabIndex={0} hidden={selected!==i}>{selected===i?children[i]:null}</div>)}
 </section>;
}
