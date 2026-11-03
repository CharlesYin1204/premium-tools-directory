import test from 'node:test';import assert from 'node:assert/strict';import {defaultPortal,portalError} from '../lib/portal-config.js';
const check=item=>portalError({...defaultPortal(),announcements:[{id:'notice',title:'站点更新',enabled:true,url:'',...item}]});
test('公告正文可独立发布，链接和长度仍受校验',()=>{assert.equal(check({body:'功能更新说明'}),null);assert.equal(check({url:'/categories'}),null);assert.ok(check({}));assert.ok(check({body:' '.repeat(3)}));assert.ok(check({body:'x'.repeat(5001)}));assert.ok(check({body:123}));assert.ok(check({body:'正文',url:'javascript:alert(1)'}));});
