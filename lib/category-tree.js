// Cycle-safe helpers shared by draft management and the published directory.
export function categoryPath(id,categories){
 const byId=new Map(categories.map(c=>[c.id,c])),seen=new Set(),path=[];
 let current=byId.get(id);while(current&&!seen.has(current.id)){seen.add(current.id);path.unshift(current);current=byId.get(current.parent_id);}return path;
}
export function descendantIds(id,categories){
 const ids=new Set([id]);const queue=[id];for(let i=0;i<queue.length;i++)for(const c of categories)if(c.parent_id===queue[i]&&!ids.has(c.id)){ids.add(c.id);queue.push(c.id);}return ids;
}
export function categoryTreeOrder(categories){
 const byId=new Set(categories.map(c=>c.id)),out=[],seen=new Set();
 function walk(c){if(seen.has(c.id))return;seen.add(c.id);out.push(c);categories.filter(n=>n.parent_id===c.id).forEach(walk);}
 categories.filter(c=>!c.parent_id||!byId.has(c.parent_id)).forEach(walk);categories.forEach(walk);return out;
}
export function validParent(id,parentId,categories){
 if(!parentId)return true;
 const byId=new Map(categories.map(c=>[c.id,c])),seen=new Set([id]);let next=parentId;
 while(next){if(seen.has(next)||!byId.has(next))return false;seen.add(next);next=byId.get(next).parent_id;}return true;
}
export function visibleCategories(categories){return categories.filter(c=>validParent(c.id,c.parent_id,categories));}
