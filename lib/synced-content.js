export function syncedContent(content){return ['laosiji-video','laosiji-comic'].includes(content?.source_system);}
export const sourceOwnedFields=['source_system','source_id','source_site_id','source_site_name','video_type','original_title','director','actors','release_date','region','language','duration_seconds','rating','type','slug','title','summary','cover_url','play_url','media_format','chapters','tags'];
export function changedSourceField(before,after){return sourceOwnedFields.find(key=>JSON.stringify(before[key]??'')!==JSON.stringify(after[key]??''));}
// Source fields always track the latest accepted source version; local approval and
// association fields remain local. Operator exclusion lives outside both snapshots.
export function mergeSyncedContent(draft,mapped,priorMapped){const next={...draft};for(const [key,value] of Object.entries(mapped)){if(sourceOwnedFields.includes(key)||priorMapped&&JSON.stringify(draft[key])===JSON.stringify(priorMapped[key]))next[key]=value;}return next;}
