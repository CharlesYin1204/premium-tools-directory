import test from 'node:test';import assert from 'node:assert/strict';
import {defaultRanking,rankingError,recommendContents,recommendationRuleId} from '../lib/recommendations.js';
import {videoDetailError,defaultVideoDetail} from '../lib/video-detail-config.js';
const now=Date.parse('2026-10-08T00:00:00Z'),current={id:'current',type:'video',source_system:'source',source_id:'1',tags:['a'],category_ids:['cat']};
const video=(id,extra={})=>({id,type:'video',rights_status:'approved',has_published:true,...extra});
test('natural recommendations deduplicate source identities and honor published view exclusions',()=>{
 const contents=[current,video('same',{source_system:'source',source_id:'1'}),video('off',{has_published:false}),video('excluded',{manual_excluded:true}),video('revoked',{revoked:true}),video('unknown',{rights_status:'unknown'}),video('unavailable',{available:false}),{id:'comic',type:'comic'},video('two',{source_system:'source',source_id:'2'}),video('two'),video('other-copy',{source_system:'source',source_id:'2'})];
 assert.deepEqual(recommendContents(current,contents,{},now).items.map(r=>r.item.id),['two']);
});
test('weights change ranking, duplicate tags do not inflate score and commercial fields are ignored',()=>{
 const contents=[video('cat',{category_ids:['cat']}),video('tag',{tags:['a','a']}),video('ad',{priority:100,hot:999999,popularity:999999})];
 const result=recommendContents(current,contents,{ranking:{...defaultRanking(),tag_weight:8}},now);
 assert.deepEqual(result.items.map(r=>r.item.id),['tag','cat','ad']);assert.equal(result.items[0].score,8);assert.equal(result.items[2].score,0);assert.ok(result.degradation.includes('业务热度'));
});
test('freshness uses real publication time, decays inside configured window, and never rewards missing or future dates',()=>{
 const contents=[video('recent',{published_at:'2026-10-07 00:00:00'}),video('old',{published_at:'2026-09-01T00:00:00Z'}),video('future',{published_at:'2026-10-09T00:00:00Z'}),video('missing')];
 const result=recommendContents(current,contents,{ranking:{...defaultRanking(),recency_weight:10,recency_days:10}},now);
 assert.equal(result.items[0].item.id,'recent');assert.equal(result.items[0].parts.recency,9);for(const row of result.items.slice(1))assert.equal(row.parts.recency,0);
});
test('stable fallback changes only ties, supports recent/order, counts available candidates and hides disabled module',()=>{
 const contents=[video('old',{published_at:'2026-09-01',sort_order:0}),video('new',{published_at:'2026-10-01',sort_order:20}),video('newer',{published_at:'2026-10-01',sort_order:20})];
 const config={limit:2,ranking:defaultRanking()},result=recommendContents(current,contents,config,now);
 assert.deepEqual(result.items.map(r=>r.item.id),['new','newer']);assert.equal(result.candidate_count,3);
 assert.deepEqual(recommendContents(current,[...contents].reverse(),config,now).items,result.items);
 assert.equal(recommendContents(current,contents,{ranking:{...defaultRanking(),fallback:'order'}},now).items[0].item.id,'old');
 assert.deepEqual(recommendContents(current,contents,{enabled:false},now).items,[]);
 assert.notEqual(recommendationRuleId(config),recommendationRuleId({...config,limit:3}));
});
test('settings reject incomplete, nonnumeric, out-of-range and unknown recommendation rules while legacy settings remain valid',()=>{
 for(const change of [{tag_weight:-1},{tag_weight:'8'},{category_weight:1.5},{recency_weight:101},{recency_days:0},{recency_days:366},{fallback:'hot'},{advertising_weight:20}]){const ranking={...defaultRanking(),...change};assert.ok(rankingError(ranking));assert.ok(videoDetailError({...defaultVideoDetail(),ranking}));}
 assert.ok(rankingError({}));assert.ok(rankingError(null));assert.equal(videoDetailError(defaultVideoDetail()),null);assert.equal(videoDetailError({...defaultVideoDetail(),ranking:defaultRanking()}),null);
});
