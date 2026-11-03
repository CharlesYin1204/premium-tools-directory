import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareEntryDraft,optionalImportFields} from '../lib/import-entry.js';
import {validate} from '../lib/resources.js';
const resources=[{id:'category',kind:'categories',name:'【站长推荐】'},{id:'company',kind:'companies',name:'渠道'}];
test('导入名称匹配、去重、无效关联留空、编号稳定',()=>{
 const input={name:'真实站点',target_url:'https://example.org',category_ids:'站长推荐,missing,站长推荐',company_id:'渠道',tags:'one,one,two',description:'a'.repeat(210)};
 const a=prepareEntryDraft(input,resources),b=prepareEntryDraft(input,resources);
 assert.equal(a.data.slug,b.data.slug);assert.deepEqual(a.data.category_ids,['category']);assert.equal(a.data.company_id,'company');assert.deepEqual(a.data.tags,['one','two']);assert.equal(a.data.description.length,200);
 assert.equal(prepareEntryDraft({...input,company_id:'removed'},resources).data.company_id,'');
 assert.equal(optionalImportFields.has('target_url'),false);
});
test('不完整关联只允许站点草稿；发布仍要求分类；目标内网不放行',async()=>{
 const data={name:'待补全站点',slug:'incomplete',target_url:'https://127.0.0.1',category_ids:[],company_id:''};
 await assert.rejects(validate('entries',data,[],'new',false),e=>!!e.fields?.target_url);
 await assert.rejects(validate('entries',data,[],'new',true),e=>!!e.fields?.category_ids);
});
test('缺失网址可以存草稿，不能发布；空网址不与其他空草稿冲突',async()=>{
 const d=prepareEntryDraft({name:'待补全站点'},[],{uploadId:'upload',rowNumber:2}).data;
 const other=prepareEntryDraft({name:'待补全站点'},[],{uploadId:'upload',rowNumber:3}).data;
 assert.notEqual(d.slug,other.slug);
 await validate('entries',d,[{id:'other',kind:'entries',draft:JSON.stringify(other),published:null}],'new');
 await assert.rejects(validate('entries',{...d,company_id:'c',category_ids:['a']},[],'new',true),e=>!!e.fields?.target_url);
});
