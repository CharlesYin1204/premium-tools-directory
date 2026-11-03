import {isLocalContentTarget} from '../lib/local-content-target.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {landingEnabled,shouldShowLanding,landingPath,visitPath} from '../lib/entry-landing.js';
import {activeAd,adSlots} from '../lib/ad-slots.js';
test('全站开关、旧数据与单站覆盖',()=>{
 for(const enabled of [false,true]) {
  assert.equal(landingEnabled({entry_landing_enabled:enabled},{}),enabled);
  assert.equal(landingEnabled({entry_landing_enabled:enabled},{landing_mode:'inherit'}),enabled);
  assert.equal(landingEnabled({entry_landing_enabled:enabled},{landing_mode:'direct'}),false);
  assert.equal(landingEnabled({entry_landing_enabled:enabled},{landing_mode:'landing'}),true);
 }
 assert.equal(landingEnabled({},{}),true);
});
test('中间页保留归因，继续访问及备用地址不再循环',()=>{
 const entry={id:'entry',slug:'example'},site={entry_landing_enabled:true};
 const q=new URLSearchParams({placement:'ad',creative_version:'2',page:'/category/tools',event_id:'abc',impression_id:'proof',device:'h5',channel:'source'});
 assert.equal(shouldShowLanding(site,entry,q),true);
 const landing=new URL(landingPath(entry,q),'https://example.test');
 assert.equal(landing.pathname,'/site/example');assert.equal(landing.searchParams.toString(),q.toString());
 const visit=new URL(visitPath(entry,q),'https://example.test');
 assert.equal(visit.pathname,'/go/entry');assert.equal(shouldShowLanding(site,entry,visit.searchParams),false);
 for(const [key,value] of q)assert.equal(visit.searchParams.get(key),value);
 q.set('backup','1');assert.equal(shouldShowLanding(site,entry,q),false);
});
test('独立广告位仅接受已发布站点落地页，支持卡片及横幅',()=>{
 const ad={id:'ad',entry_id:'target',location:'landing',device:'all'};
 const data={entries:[{id:'target',slug:'target'},{id:'source',slug:'source'}],placements:[ad]};
 assert.equal(activeAd(data,'ad','target','pc','/site/source'),ad);
 assert.equal(activeAd(data,'ad','target','h5','/site/source'),ad);
 for(const page of ['/','/site/missing','/video/source'])assert.equal(activeAd(data,'ad','target','pc',page),null);
 assert.deepEqual(adSlots.landing.templates,['card','banner']);
});
test('真实路由控制流：开启只进入本地落地页，继续访问才记录出站点击，HEAD不计数',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=(await readFile(new URL('../app/go/[id]/route.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export /g,'');
 let targetCalls=0,clicks=0;
 const entry={id:'actual',slug:'actual',target_url:'https://example.org/'};
 const deps={isLocalContentTarget,shouldShowLanding,landingPath,getPublic:async()=>({site:{entry_landing_enabled:true,analytics_enabled:true},entries:[entry],placements:[],contents:[],companies:[]}),entryTarget:async()=>{targetCalls++;return {url:entry.target_url};},safeUrl:()=>true,entryPlatform:()=> 'pc',NextResponse:{redirect:(url,opts)=>new Response(null,{...opts,headers:{...opts.headers,Location:String(url)}})},isClickRequest:()=>true,randomUUID:()=> 'test-event',clickIpIdentity:()=>({}),scheduleClick:()=>{clicks++;},after:()=>{},health:()=>{},event:()=>{},serverEventTime:()=>{},eventResourceMode:()=> 'entry',sourcePage:x=>x,adSnapshot:()=>({})};
 const handlers=new Function(...Object.keys(deps),source+';return {GET,HEAD};')(...Object.values(deps));
 const context={params:Promise.resolve({id:'actual'})};
 const first=await handlers.GET(new Request('http://127.0.0.1:3020/go/actual?event_id=kept'),context);
 assert.equal(first.status,302);assert.equal(first.headers.get('location'),'/site/actual?event_id=kept');assert.equal(targetCalls,0);assert.equal(clicks,0);
 const next=await handlers.GET(new Request('http://127.0.0.1:3020/go/actual?visit=1'),context);
 assert.equal(next.headers.get('location'),'https://example.org/');assert.equal(targetCalls,1);assert.equal(clicks,1);
 await handlers.HEAD(new Request('http://127.0.0.1:3020/go/actual?visit=1',{method:'HEAD'}),context);assert.equal(clicks,1);
 entry.target_url='/videos';const local=await handlers.GET(new Request('http://127.0.0.1:3020/go/actual?visit=1'),context);assert.equal(local.headers.get('location'),'/videos');assert.equal(clicks,2);
});
