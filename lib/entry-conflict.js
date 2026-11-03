// URL serialization normalizes host casing, default ports and an empty root path.
// Preserve query order, fragments, path casing and protocol: these can change targets.
function targetKey(value){try{return new URL(value).href;}catch{return value;}}
export function entryConflict(data,peers){
 const url=targetKey(data.target_url),name=data.name?.trim();
 if(url&&peers.some(peer=>peer&&targetKey(peer.target_url)===url))return 'target_url';
 if(data.company_id&&peers.some(peer=>peer&&peer.company_id===data.company_id&&peer.name?.trim()===name))return 'name';
 return null;
}
