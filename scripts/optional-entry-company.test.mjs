import test from 'node:test';import assert from 'node:assert/strict';
import {publicData,validate} from '../lib/resources.js';
import {fields} from '../lib/catalog.js';
const category={id:'cat',kind:'categories',published:{name:'分类',slug:'cat'},draft:{name:'分类',slug:'cat'}};
test('入口渠道选填；已发布无渠道入口保留，失效渠道入口仍隐藏',()=>{
 assert.ok(!fields.entries.find(f=>f[0]==='company_id')[3]);
 const entry=(id,company_id)=>({id,kind:'entries',published:{name:id,slug:id,company_id,category_ids:['cat']}});
 assert.deepEqual(publicData([category,entry('no-channel',''),entry('bad-channel','missing')]).entries.map(x=>x.id),['no-channel']);
});
test('无渠道发布到达目标校验，填写无效渠道仍拒绝',async()=>{
 const data={name:'普通入口',slug:'normal',company_id:'',category_ids:['cat'],target_url:'https://127.0.0.1'};
 await assert.rejects(validate('entries',data,[category],'new',true),e=>!!e.fields?.target_url);
 await assert.rejects(validate('entries',{...data,company_id:'missing'},[category],'new',true),e=>!!e.fields?.company_id);
});
