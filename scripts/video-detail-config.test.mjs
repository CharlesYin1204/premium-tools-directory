import test from 'node:test';import assert from 'node:assert/strict';
import {defaultVideoDetail,videoDetailConfig,videoDetailError} from '../lib/video-detail-config.js';
import {configDefaults,configError} from '../lib/site-config.js';
test('legacy publications retain existing video presentation',()=>{assert.deepEqual(videoDetailConfig({}),defaultVideoDetail());assert.equal(configDefaults().video_detail.limit,4);assert.equal(configError({}),null);});
test('video configuration rejects invalid booleans, count, titles and unknown fields',()=>{for(const change of [{enabled:'false'},{limit:0},{limit:13},{limit:2.5},{title:' '},{title:'x'.repeat(61)},{note:'x'.repeat(161)},{extra:true}]){assert.ok(videoDetailError({...defaultVideoDetail(),...change}));assert.equal(configError({video_detail:{...defaultVideoDetail(),...change}}).key,'video_detail');}assert.ok(videoDetailError(null));assert.ok(videoDetailError([]));});
test('disabled recommendations still accept valid saved configuration',()=>{const config={enabled:false,title:'更多内容',note:'',limit:12};assert.equal(videoDetailError(config),null);assert.deepEqual(videoDetailConfig({video_detail:config}),config);});
