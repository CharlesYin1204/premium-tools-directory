import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPublished} from '../lib/public-search.js';
import {adCapacity} from '../lib/ad-slots.js';
import {promotionDisplay} from '../lib/promotion-display.js';
import {placementConflict} from '../lib/placement-rules.js';

test('搜索去空格、忽略大小写、名称优先，兼容别名、公司和内容',()=>{
 const data={entries:[{id:'b',name:'Extra',description:'Figma 插件'},{id:'a',name:'Figma',aliases:['设计'],company_id:'co'}],contents:[{id:'v',type:'video',title:'Figma 入门'},{id:'c',type:'comic',title:'画册',tags:['设计']}],companies:[{id:'co',name:'Design Company'}]};
 assert.deepEqual(searchPublished(data,' FIGMA ')[0].items.map(x=>x.id),['a','b']);
 assert.equal(searchPublished(data,'figma')[1].items.length,1);
 assert.equal(searchPublished(data,'设计')[2].items[0].id,'c');
 assert.equal(searchPublished(data,'company')[0].items[0].id,'a');
 assert.equal(searchPublished(data,'   ').flatMap(g=>g.items).length,0);
 assert.equal(searchPublished(data,'不存在').flatMap(g=>g.items).length,0);
});
test('首页轮播最多5条，其他横幅仍为1条；设备、排期、暂停及重复规则生效',()=>{
 const ad=i=>({id:'ad'+i,entry_id:'e'+i,location:'home_banner',template:'banner',device:'all',pc_image_url:'/pc.webp',h5_image_url:'/h5.webp'});
 const placements=Array.from({length:6},(_,i)=>ad(i));
 const data={entries:placements.map(p=>({id:p.entry_id})),placements};
 assert.equal(adCapacity(ad(0)),5);assert.equal(adCapacity({...ad(0),location:'category'}),1);
 assert.equal(promotionDisplay(data,{location:'home_banner'})[0].items.length,5);
 assert.equal(placementConflict(ad(5),placements.slice(0,5),adCapacity(ad(5))),'capacity');
 assert.equal(placementConflict(ad(4),placements.slice(0,4),5),null);
 assert.equal(placementConflict(ad(0),[ad(0)],5),'duplicate');
 data.placements=[ad(0),{...ad(1),paused:true},{...ad(2),end_at:'2020-01-01T00:00'},{...ad(3),device:'pc'},{...ad(4),h5_image_url:''}];
 const groups=promotionDisplay(data,{location:'home_banner'});
 assert.deepEqual(groups.find(g=>g.device==='h5').items.map(p=>p.id),['ad0']);
 assert.deepEqual(groups.find(g=>g.device==='pc').items.map(p=>p.id),['ad0','ad3','ad4']);
});
