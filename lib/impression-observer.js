// DOM lifecycle only. Campaign identity and backend eligibility remain server-owned.
export function observeImpressions({root=document.getElementById('main')||document.body,onImpression,duration=1000,threshold=.5}){
 const seen=new Set(),visible=new Set(),timers=new Map();let suspended=false;
 const keyOf=target=>JSON.stringify([target.dataset.entry,target.dataset.placement||'',target.closest('.home-tab-module')?.getAttribute('aria-label')||'page']);
 const signature=target=>JSON.stringify([target.dataset.entry,target.dataset.placement,target.dataset.creativeVersion,...[...target.querySelectorAll('img')].map(img=>[img.getAttribute('src'),img.getAttribute('srcset'),img.currentSrc])]);
 const ready=target=>!target.classList.contains('ad-banner')||[...target.querySelectorAll('img')].some(img=>img.complete&&img.naturalWidth>0);
 const eligible=target=>!suspended&&document.visibilityState==='visible'&&visible.has(target)&&target.isConnected&&ready(target)&&!seen.has(keyOf(target));
 const cancel=target=>{clearTimeout(timers.get(target)?.handle);timers.delete(target);};
 const start=target=>{
  if(!eligible(target)||timers.has(target))return;
  const pending={signature:signature(target)};
  pending.handle=setTimeout(()=>{
   // Flush visibility transitions already queued before a delayed timer callback.
   consume(observer.takeRecords());
   if(timers.get(target)!==pending)return;timers.delete(target);
   if(!eligible(target))return;
   if(pending.signature!==signature(target)){start(target);return;}
   seen.add(keyOf(target));onImpression({entry_id:target.dataset.entry,placement_id:target.dataset.placement||undefined,creative_version:target.dataset.creativeVersion||undefined});
  },duration);timers.set(target,pending);
 };
 const consume=entries=>{for(const {isIntersecting,intersectionRatio,target} of entries){if(!isIntersecting||intersectionRatio<threshold){visible.delete(target);cancel(target);}else{visible.add(target);start(target);}}};
 const observer=new IntersectionObserver(consume,{threshold});
 const visit=(node,fn)=>{if(node.nodeType!==1)return;if(node.matches('[data-entry]'))fn(node);node.querySelectorAll('[data-entry]').forEach(fn);};
 const reset=target=>{if(!target)return;cancel(target);start(target);};
 const visibility=()=>{timers.forEach((_timer,target)=>cancel(target));if(!suspended&&document.visibilityState==='visible')visible.forEach(start);};
 const loaded=e=>reset(e.target.closest?.('[data-entry]'));
 const hide=()=>{suspended=true;visibility();},show=()=>{suspended=false;visibility();};
 document.addEventListener('visibilitychange',visibility);document.addEventListener('load',loaded,true);document.addEventListener('error',loaded,true);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
 visit(root,el=>observer.observe(el));
 const changes=new MutationObserver(records=>{
  const resetTargets=new Set();
  for(const record of records){const target=record.target.closest?.('[data-entry]');if(target)resetTargets.add(target);
   if(record.type==='childList'){record.removedNodes.forEach(node=>visit(node,el=>{observer.unobserve(el);visible.delete(el);cancel(el);}));record.addedNodes.forEach(node=>visit(node,el=>observer.observe(el)));}
  }
  resetTargets.forEach(reset);
 });
 changes.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset','data-entry','data-placement','data-creative-version','class']});
 return ()=>{changes.disconnect();observer.disconnect();timers.forEach((_timer,target)=>cancel(target));document.removeEventListener('visibilitychange',visibility);document.removeEventListener('load',loaded,true);document.removeEventListener('error',loaded,true);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);};
}
