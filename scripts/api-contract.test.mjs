import test from 'node:test';
import assert from 'node:assert/strict';
import {apiMethods,readJsonObject} from '../lib/api-contract.js';
import {relatedContents} from '../lib/public-content.js';

test('API matches complete paths and separates reads from writes',()=>{
 assert.deepEqual(apiMethods('public'),['GET']);
 assert.deepEqual(apiMethods('auth/login'),['POST']);
 assert.deepEqual(apiMethods('admin/contents',['contents']),['GET','POST']);
 assert.equal(apiMethods('admin/contents/extra',['contents']),null);
});
test('non-object JSON and malformed batches receive client errors',async()=>{
 for(const body of ['null','[]','"hello"','{'])await assert.rejects(readJsonObject(new Request('http://localhost',{method:'POST',body})),{status:400});
 for(const batch of [[],[null],[{id:''}],[{id:7}],Array.from({length:51},()=>({id:'a'}))])await assert.rejects(readJsonObject(new Request('http://localhost',{method:'POST',body:JSON.stringify({batch})})),{status:422});
});
test('stream byte limit applies without Content-Length',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(10));},cancel(){cancelled=true;}});
 await assert.rejects(readJsonObject(new Request('http://localhost',{method:'POST',body:stream,duplex:'half'}),16),{status:413});
 assert.equal(cancelled,true);
});
test('valid JSON retains data and version for existing handlers',async()=>{
 const body={action:'save',version:3,data:{title:'真实标题'}};
 assert.deepEqual(await readJsonObject(new Request('http://localhost',{method:'POST',body:JSON.stringify(body)})),body);
});
test('recommendations exclude current and other media and prioritize shared topics',()=>{
 const current={id:'current',type:'video',category_ids:['a'],tags:['x']};
 const items=[current,{id:'other',type:'video'},{id:'comic',type:'comic',category_ids:['a']},{id:'tag',type:'video',tags:['x']},{id:'category',type:'video',category_ids:['a']},{id:'both',type:'video',category_ids:['a'],tags:['x']}];
 assert.deepEqual(relatedContents(current,items).map(i=>i.id),['both','category','tag','other']);
 assert.deepEqual(relatedContents(current,[current]),[]);
 assert.equal(items[0],current);
});
