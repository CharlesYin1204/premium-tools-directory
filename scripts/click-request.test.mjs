import test from 'node:test';import assert from 'node:assert/strict';
import {isClickRequest} from '../lib/click-request.js';
const request=(method='GET',headers={},query='')=>new Request('https://navigation.example/go/entry'+query,{method,headers});
test('only navigation GET can record clicks; diagnostics still allow marked real actions',()=>{
 assert.equal(isClickRequest(request()),true);
 assert.equal(isClickRequest(request('GET',{},'?test=1&device=h5')),true);
 for(const method of ['HEAD','OPTIONS','POST'])assert.equal(isClickRequest(request(method)),false);
 for(const query of ['?preview','?preview=0','?preview=1'])assert.equal(isClickRequest(request('GET',{},query)),false);
});
test('browser and framework speculative requests never record clicks',()=>{
 for(const headers of [{purpose:'prefetch'},{'Sec-Purpose':'prefetch;prerender'},{purpose:'prerender'},{purpose:'PREFETCH'},{'next-router-prefetch':'1'},{'x-middleware-prefetch':''}])assert.equal(isClickRequest(request('GET',headers)),false);
 assert.equal(isClickRequest(request('GET',{'Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document'})),true);
});
