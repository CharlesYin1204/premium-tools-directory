import test from 'node:test';import assert from 'node:assert/strict';
import {categoryPath,descendantIds,categoryTreeOrder,validParent,visibleCategories} from '../lib/category-tree.js';
import {categoryEntries,categoryNavigation} from '../lib/category-navigation.js';
import {validate,publicData} from '../lib/resources.js';
const cats=[{id:'a',name:'一级',slug:'a'},{id:'b',name:'二级',slug:'b',parent_id:'a'},{id:'c',name:'三级',slug:'c',parent_id:'b'},{id:'d',name:'四级',slug:'d',parent_id:'c'}];
const rows=cats.map(c=>({id:c.id,kind:'categories',draft:c,published:c}));
test('arbitrary depth preserves ancestry, ordering and unique entry aggregation',()=>{
 assert.deepEqual(categoryPath('d',cats).map(c=>c.id),['a','b','c','d']);assert.deepEqual(categoryTreeOrder([...cats].reverse()).map(c=>c.id),['a','b','c','d']);
 assert.deepEqual([...descendantIds('b',cats)],['b','c','d']);
 const entries=[{id:'e',category_ids:['d','b']}];assert.equal(categoryEntries(cats[0],entries,cats).length,1);
 const nav=categoryNavigation(cats[3],entries,cats);assert.equal(nav.root.id,'a');assert.deepEqual(nav.ancestors.map(c=>c.id),['a','b','c']);assert.equal(nav.branches.length,3);
});
test('multi-level API validation accepts valid parent and rejects loops and missing parents',async()=>{
 await validate('categories',{name:'第五级',slug:'fifth',parent_id:'d'},rows,'e');
 for(const parent_id of ['a','b','d','missing'])await assert.rejects(validate('categories',{name:'一级更新',slug:'a',parent_id},rows,'a'),e=>e.status===422&&!!e.fields?.parent_id||e.status===422);
 assert.equal(validParent('a','d',cats),false);assert.equal(validParent('e','d',cats),true);
});
test('unpublished ancestors hide all descendant categories and dependent public entries',()=>{
 const all=[...rows,{id:'co',kind:'companies',published:{name:'渠道'}},{id:'entry',kind:'entries',published:{name:'入口',company_id:'co',category_ids:['d']}}];assert.equal(publicData(all).entries.length,1);
 all[0]={...all[0],published:null};assert.equal(publicData(all).categories.length,0);assert.equal(publicData(all).entries.length,0);
 const cyclic=[{id:'a',parent_id:'b'},{id:'b',parent_id:'a'}];assert.deepEqual(visibleCategories(cyclic),[]);assert.equal(categoryPath('a',cyclic).length,2);
});
