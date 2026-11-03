import test from 'node:test';import assert from 'node:assert/strict';
import {importTarget} from '../lib/import-target.js';
import {importMapping} from '../lib/import-feedback.js';
test('空网址回退显示域名，完整网址优先，危险格式不伪装成https',()=>{
 assert.equal(importTarget('','example.org'),'https://example.org');
 assert.equal(importTarget('http://example.com','example.org'),'http://example.com');
 assert.equal(importTarget('example.org/path?q=1'),'https://example.org/path?q=1');
 assert.equal(importTarget('javascript:alert(1)'),'javascript:alert(1)');
 assert.equal(importTarget('',''),'');
 assert.deepEqual(importMapping(['目标网址URL','页面显示域名'],[['target_url','目标网址'],['display_domain','域名']]),{target_url:0,display_domain:1});
});
