import test from 'node:test';
import assert from 'node:assert/strict';
import {syncParams} from '../lib/laosiji-sync.js';
test('withdrawal uses documented all-position and negative status regardless of UI position',()=>{
 const p=syncParams({type:'video',mode:'withdrawn',position:'movie',end_time:'2026-09-28T12:00'});
 assert.equal(p.position,'all');assert.equal(p.status,-1);assert.equal(p.end_time,'2026-09-28 12:00:00');assert.equal(p.mode,'withdrawn');
});
test('reject unsupported withdrawal and task modes',()=>{
 for(const input of [{type:'comic',mode:'withdrawn'},{type:'video',mode:'delete'},{type:'video',mode:true}])assert.throws(()=>syncParams(input),e=>e.status===422);
});
test('legacy import does not gain a withdrawal filter and validates time windows',()=>{
 const p=syncParams({type:'video',position:'movie'});assert.equal(p.mode,'import');assert.equal(p.status,undefined);
 assert.throws(()=>syncParams({type:'video',position:'movie',start_time:'2026-02-30 01:00:00'}),e=>e.status===422);
});
