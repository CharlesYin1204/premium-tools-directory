import test from 'node:test';
import assert from 'node:assert/strict';
import {aiReadiness,modelCheckLabel} from '../lib/ai-readiness.js';
test('AI工具推荐允许文字模型独立启用，视觉模型为可选增强',()=>{
 const feature={vision_model_id:'selected'},base={id:'selected',enabled:true,has_api_key:true,capabilities:['vision']};
 assert.equal(aiReadiness(feature,[]).ready,false);
 for(const patch of [{enabled:false},{has_api_key:false}]){
  assert.equal(aiReadiness(feature,[{...base,...patch}]).ready,false);
 }
 assert.equal(aiReadiness(feature,[base]).ready,true);
 const text={id:'text',enabled:true,has_api_key:true,capabilities:['text']};
 assert.equal(aiReadiness({vision_model_id:''},[text]).ready,true);
 assert.equal(aiReadiness({vision_model_id:'other'},[base,text]).ready,true);
});
test('连接可达但模型未匹配不能显示为模型目录匹配',()=>{
 assert.equal(modelCheckLabel('warning'),'接口可达 · 模型未匹配');
 assert.equal(modelCheckLabel('ok'),'模型目录已匹配');
 assert.equal(aiReadiness({vision_model_id:'a'},[{id:'a',capabilities:['vision'],has_api_key:true,enabled:true,last_check_status:'failed'}]).connection,'failed');
});
