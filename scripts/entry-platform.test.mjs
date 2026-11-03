import test from 'node:test';
import assert from 'node:assert/strict';
import {entryPlatform,targetSelection} from '../lib/entry-platform.js';
import {entryTarget} from '../lib/entry-target.js';
const entry={target_url:'https://web.example/',android_url:'https://android.example/',ios_url:'https://ios.example/',action_mode:'download'};
test('server chooses only configured device destinations and records honest fallbacks',()=>{
 for(const [ua,hint,os] of [['Mozilla Android 14',false,'android'],['Mozilla iPhone',false,'ios'],['Mozilla iPad',false,'ios'],['Mozilla Macintosh',true,'ios'],['Mozilla Macintosh',false,'desktop'],['Windows NT 10',false,'desktop'],['unknown',true,'unknown']]){
  assert.equal(entryPlatform(ua,hint),os);
  const r=targetSelection(entry,os);assert.equal(r.url,os==='android'?entry.android_url:os==='ios'?entry.ios_url:entry.target_url);
 }
 assert.equal(targetSelection({...entry,ios_url:''},'ios').fallback_reason,'missing_platform_target');
 assert.equal(targetSelection({...entry,action_mode:undefined},'android').url,entry.target_url);
 assert.equal(targetSelection(entry,'unknown').target_platform,'web');
});
test('invalid configured download fails instead of silently changing destination',async()=>{
 const r=await entryTarget({...entry,android_url:'javascript:bad'},false,async url=>{if(!url.startsWith('https:'))throw Error();return url;},'android');
 assert.equal(r.status,503);assert.equal(r.url,undefined);
 const ok=await entryTarget(entry,false,async url=>url,'ios');assert.equal(ok.target_platform,'ios');assert.equal(ok.action_mode,'download');
});
