import {descendantIds,categoryPath} from './category-tree.js';
// Inputs must come from the public, published resource view.
export function categoryEntries(category,entries,categories){
 if(!category)return entries;
 const ids=descendantIds(category.id,categories);
 return entries.filter(entry=>(entry.category_ids||[]).some(id=>ids.has(id)));
}
export function categoryNavigation(category,entries,categories){
 const populated=categories.filter(c=>c.show_empty||categoryEntries(c,entries,categories).length>0);
 const parent=category?.parent_id?categories.find(c=>c.id===category.parent_id):null;
 const ancestors=category?categoryPath(category.id,categories).slice(0,-1):[];
 const root=ancestors[0]||category;
 return {parent,root,ancestors,branches:category?[...ancestors,category].map(owner=>({owner,children:populated.filter(c=>c.parent_id===owner.id)})).filter(b=>b.children.length):[],roots:populated.filter(c=>!c.parent_id),children:root?populated.filter(c=>c.parent_id===root.id):[]};
}
export function activeNavigation(path,href){
 return path===href||href==='/categories'&&path.startsWith('/category/')||href==='/videos'&&path.startsWith('/video/')||href==='/comics'&&path.startsWith('/comic/');
}
