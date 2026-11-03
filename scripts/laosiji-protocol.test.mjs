import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {encryptPayload,decryptPayload,parseSearch,mapSource} from '../lib/laosiji-protocol.js';
for(const key of ['short','0123456789abcdef','0123456789abcdef-truncated'])test('AES compatibility with OpenSSL: '+key.length+' bytes',()=>{
 const payload={page:1,page_size:20,keywords:'中文'};
 const hex=Buffer.from(key).toString('hex').padEnd(32,'0').slice(0,32);
 const expected=execFileSync('openssl',['enc','-aes-128-ecb','-K',hex,'-nosalt','-base64','-A'],{input:JSON.stringify(payload)}).toString();
 assert.equal(encryptPayload(payload,key),expected);assert.deepEqual(decryptPayload(expected,key),payload);
});
test('reject malformed encrypted body and undocumented envelopes',()=>{
 for(const body of ['','not-base64!','AAAA'])assert.throws(()=>decryptPayload(body,'key'));
 assert.throws(()=>parseSearch({results:[]},'video'));assert.throws(()=>parseSearch([{name:'missing ID'}],'video'));
 assert.deepEqual(parseSearch({data:[]},'video'),[]);assert.deepEqual(parseSearch([],'comic'),[]);
});
test('candidate mapping never grants rights or leaks internal media URLs',()=>{
 const data={id:'contract-shape',name:'字段映射',img_x:'https://internal.invalid/cover.bnc',links:[{m3u8_url:'https://internal.invalid/video.m3u8'}]};
 const mapped=mapSource('video',data,{});assert.equal(mapped.rights_status,'unknown');assert.equal(mapped.cover_url,'');assert.equal(mapped.play_url,'');assert.equal(mapped.source_system,'laosiji-video');assert.ok(!JSON.stringify(mapped).includes('internal.invalid'));
 assert.throws(()=>mapSource('comic',{id:'x',name:'x',chapter:[{name:'x',content:{}}]},{}));
});
