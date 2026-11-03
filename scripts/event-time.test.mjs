import test from 'node:test';import assert from 'node:assert/strict';
import {clientEventTime,serverEventTime,eventTimePolicy} from '../lib/event-time.js';
const received=Date.parse('2026-10-08T16:00:01.000Z'),policy=eventTimePolicy({});
test('late events retain their original Shanghai day and distinct receipt time',()=>{
 const t=clientEventTime('2026-10-08T15:59:58.500Z',received,policy);assert.equal(t.occurred_at,'2026-10-08 15:59:58.500');assert.equal(t.received_at,'2026-10-08 16:00:01.000');assert.equal(t.time_basis,'client');assert.equal(t.client_occurred_at,t.occurred_at);
});
test('server action and missing browser timestamps have explicit separate provenance',()=>{
 assert.equal(serverEventTime(received).time_basis,'server_action');const t=clientEventTime(undefined,received,policy);assert.equal(t.time_basis,'server_fallback');assert.equal(t.client_occurred_at,null);assert.equal(t.occurred_at,t.received_at);
});
test('bounded clock lead clamps effective time and preserves reported timestamp',()=>{
 const input=new Date(received+policy.max_future_seconds*1000).toISOString(),t=clientEventTime(input,received,policy);assert.equal(t.time_basis,'client_clock_ahead');assert.equal(t.occurred_at,t.received_at);assert.notEqual(t.client_occurred_at,t.occurred_at);assert.throws(()=>clientEventTime(new Date(received+300001).toISOString(),received,policy),e=>e.status===422);
});
test('strict dates and configurable window reject malformed and expired occurrences',()=>{
 for(const value of [null,'',3,'2026-02-30T10:00:00.000Z','2026-10-08 16:00:00','2026-10-08T16:00:00+08:00',new Date(received-86400001).toISOString()])assert.throws(()=>clientEventTime(value,received,policy),e=>e.status===422);
 assert.equal(clientEventTime(new Date(received-86400000).toISOString(),received,policy).time_basis,'client');assert.equal(eventTimePolicy({EVENT_MAX_DELAY_HOURS:'48'}).max_delay_hours,48);assert.throws(()=>eventTimePolicy({EVENT_MAX_DELAY_HOURS:'-1'}),e=>e.status===503);
});
