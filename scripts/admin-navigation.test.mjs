import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationForRole,activeAdminLeaf} from '../lib/admin-navigation.js';
const leaves=nodes=>nodes.flatMap(n=>n.children?leaves(n.children):[n]);
test('menu permissions exclude protected leaves and empty branches',()=>{
 for(const role of ['viewer','editor','operator']){const nodes=navigationForRole(role),items=leaves(nodes);assert(!items.some(n=>n.section==='settings'||n.section==='users'));assert.equal(items.some(n=>n.section==='audit'),role==='operator');assert(nodes.every(n=>!n.children||n.children.length));}
 assert(leaves(navigationForRole('super')).some(n=>n.id==='portal-news'));
});
test('deep links select exactly the corresponding leaf with stable defaults',()=>{
 for(const [section,query,hash,id] of [['settings','','portal-news','portal-news'],['settings','','invalid','brand'],['ai','','models','ai-models'],['placements','ad_view=positions','','ads-positions'],['placements','ad_view=performance','','ads-performance'],['video-library','','','video-library'],['video-management','','','video-management'],['comic-management','','','comic-management'],['contents','type=video','','video-management'],['contents','type=comic','','comic-management'],['reports','view=entries','','reports'],['reports','view=promotions','','reports']]){assert.equal(activeAdminLeaf(section,new URLSearchParams(query),hash),id);assert.equal(leaves(navigationForRole('super')).filter(n=>n.id===id).length,1);}
});
