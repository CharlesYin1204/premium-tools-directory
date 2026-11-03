import test from 'node:test';
import assert from 'node:assert/strict';
import {importMapping,importError} from '../lib/import-feedback.js';
const specs=[['name','站点名称'],['target_url','通用落地页 / 目标网址']];
test('常见导入表头可以映射，歧义不猜测，标准字段优先',()=>{
 assert.deepEqual(importMapping(['网站名称','网址'],specs),{name:0,target_url:1});
 assert.deepEqual(importMapping([' Name ','URL'],specs),{name:0,target_url:1});
 assert.equal(importMapping(['网址','链接'],specs).target_url,-1);
 assert.equal(importMapping(['网址','target_url'],specs).target_url,1);
});
test('展示服务端字段失败原因',()=>{
 assert.equal(importError({message:'校验失败',fields:{target_url:'域名无法解析'}},specs),'校验失败；通用落地页 / 目标网址：域名无法解析');
});

test('页面栏目映射到分类字段',()=>{assert.equal(importMapping(['页面栏目'],[['category_ids','所属分类（最多 3 个）']]).category_ids,0);});
