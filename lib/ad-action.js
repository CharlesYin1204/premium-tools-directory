export const adActionNeedsReason=action=>['publish','pause','resume','offline','rollback'].includes(action);
export function adReasonError(reason){return typeof reason!=='string'||!reason.trim()||reason.trim().length>500?'请填写1–500字的操作原因':null;}
export function adActionSnapshot(data){if(!data)return null;return Object.fromEntries(['name','ad_type','title','description','cta','image_fit','crop_verified','priority','sort_order','entry_id','location','category_id','content_id','device','start_at','end_at','paused','creative_version','template','pc_image_url','h5_image_url'].map(key=>[key,data[key]??null]));}
export function adSnapshotChanges(before,after){return Object.keys(adActionSnapshot({})).filter(key=>before?.[key]!==after?.[key]);}
