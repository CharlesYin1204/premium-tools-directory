import {adSlotId,adTemplate} from './ad-slots.js';
// Only pass server-resolved live resources. Never copy client labels or URLs.
export function adSnapshot(ad,entry,target){
 if(!ad)return {};
 return {ad_name:ad.name||null,ad_type:ad.ad_type||'internal',slot_id:adSlotId(ad),creative_version:ad.creative_version||null,ad_snapshot:{name:ad.name||null,title:ad.title||entry?.name||null,description:ad.description||entry?.description||null,template:adTemplate(ad),image_fit:ad.image_fit||'cover',crop_verified:!!ad.crop_verified,pc_image_url:ad.pc_image_url||entry?.icon_url||null,h5_image_url:ad.h5_image_url||entry?.icon_url||null,cta:ad.cta||null,entry_id:entry?.id||null,target_url:target||null}};
}
export function matchesCreative(ad,version){return String(ad?.creative_version||'')===String(version||'');}
