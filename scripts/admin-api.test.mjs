import test from 'node:test';
import assert from 'node:assert/strict';
import {adminApi} from '../lib/admin-api.js';
test('gateway HTML produces readable errors without exposing its body',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('<html>proxy internal diagnostic</html>',{status:502}));
 await assert.rejects(adminApi('admin/bootstrap'),e=>e.status===502&&e.message.includes('响应异常')&&!e.message.includes('proxy'));
 await assert.rejects(adminApi('admin/contents',{}),/核对操作状态/);
});
test('API errors retain fields, status and support reference',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({message:'请检查标题',field_errors:{title:'必填'},request_id:'req-example'},{status:422}));
 await assert.rejects(adminApi('admin/contents',{}),e=>e.status===422&&e.fields.title==='必填'&&e.message.includes('req-example'));
});
test('timed out writes report uncertainty and are never automatically retried',async t=>{
 let requests=0;t.mock.method(globalThis,'fetch',(_url,options)=>{requests++;return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))));});
 await assert.rejects(adminApi('admin/contents',{}, {timeoutMs:10}),/结果尚未确认/);assert.equal(requests,1);
});
test('success preserves canonical resource response',async t=>{
 const payload={id:'id',version:2,resource:{id:'id',version:2,title:'标题'}};
 t.mock.method(globalThis,'fetch',async()=>Response.json(payload));assert.deepEqual(await adminApi('admin/contents',{}),payload);
});
