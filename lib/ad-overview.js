import {landingEnabled} from './entry-landing.js';
import {adSlots,adEligible,adCapacity,adTemplate} from './ad-slots.js';
import {promotionDisplay} from './promotion-display.js';
import {homeModules} from './home-modules.js';
export function adOverview(data,published,at=Date.now()){
 const home=homeModules(data.site.home_modules).find(m=>m.id==='promotions');
 const pages=[{id:'home',name:'首页',href:'/'},...data.entries.map(e=>({id:'landing:'+e.id,name:'落地页 · '+e.name,href:'/site/'+e.slug,landingEntry:e})),...data.categories.map(c=>({id:'category:'+c.id,name:'分类 · '+c.name,href:'/category/'+c.slug,categoryId:c.id})),...data.contents.map(c=>({id:'detail:'+c.id,name:(c.type==='video'?'视频':'漫画')+' · '+c.title,href:'/'+c.type+'/'+c.slug,contentId:c.id}))];
 const slots=Object.entries(adSlots).map(([location,slot])=>({id:location,published:published.filter(p=>p.location===location).length,pages:pages.filter(p=>location==='landing'?p.landingEntry:location==='category'?p.categoryId:location==='detail'?p.contentId:p.id==='home').map(page=>{
  const scope=p=>p.location===location&&(!p.category_id||p.category_id===page.categoryId)&&(!p.content_id||p.content_id===page.contentId);
  const disabled=location==='home'&&!home?.enabled||location==='landing'&&!landingEnabled(data.site,page.landingEntry);
  const groups=disabled?[]:promotionDisplay(data,{location,categoryId:page.categoryId,contentId:page.contentId,limit:location==='home'?home?.limit:undefined,at});
  return {page_id:page.id,devices:['pc','h5'].map(device=>{
   const supported=!slot.devices||slot.devices.includes(device),eligible=data.placements.filter(p=>scope(p)&&adEligible(p,{device,at}));
   const capacity=Math.min(slot.capacity,location==='home'?home?.limit||slot.capacity:slot.capacity,...eligible.map(adCapacity));
   const ids=groups.find(g=>g.device===device)?.items.map(p=>p.id)||[];
   return {device,disabled:disabled||!supported,ids,eligible:eligible.length,capacity,vacant:disabled||!supported?null:Math.max(0,capacity-ids.length),conflict:!disabled&&supported&&(eligible.length>capacity||new Set(eligible.map(p=>p.entry_id)).size<eligible.length||new Set(eligible.map(adTemplate)).size>1),paused:published.filter(p=>scope(p)&&p.paused&&(p.device==='all'||p.device===device)).length};
  })};
 })}));
 return {checked_at:new Date(at).toISOString(),home_order:homeModules(data.site.home_modules).filter(m=>m.enabled).map(m=>({id:m.id,title:m.title})),pages,slots};
}
