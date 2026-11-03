import {adEligible,adCapacity} from './ad-slots.js';
import {locations} from './catalog.js';
export function promotionDisplay(data,{location,categoryId,contentId,limit,at=Date.now()}){
 const capacity=locations[location]?.capacity;if(!capacity)return [];
 const count=Number.isInteger(limit)&&limit>0?Math.min(limit,capacity):capacity;
 const entries=new Set(data.entries.map(e=>e.id));
 const candidates=data.placements.filter(p=>adEligible(p,{at})&&p.location===location&&entries.has(p.entry_id)&&(!p.category_id||p.category_id===categoryId)&&(!p.content_id||p.content_id===contentId));
 return ['pc','h5'].map(device=>{const seen=new Set();const eligible=candidates.filter(p=>adEligible(p,{device,at}));const items=eligible.filter(p=>{if(!adEligible(p,{device,at})||seen.has(p.entry_id))return false;seen.add(p.entry_id);return true;}).slice(0,Math.min(count,...eligible.map(adCapacity)));return {device,items};}).filter(group=>group.items.length);
}
