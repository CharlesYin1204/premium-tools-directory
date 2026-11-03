export function aiReadiness(feature,models){
 const vision=models.find(m=>m.id===feature?.vision_model_id&&m.capabilities.includes('vision'));
 const model=models.find(m=>m.enabled&&m.has_api_key&&m.capabilities.includes('text'))||vision;
 const checks=[{label:'配置文字模型',ok:!!model},{label:'配置 API Key',ok:!!model?.has_api_key},{label:'启用模型',ok:!!model?.enabled}];
 return {model,vision,checks,ready:checks.every(c=>c.ok),connection:model?.last_check_status||'not_checked'};
}
export function modelCheckLabel(status){return {ok:'模型目录已匹配',warning:'接口可达 · 模型未匹配',failed:'连接检查失败',not_checked:'尚未检查'}[status]||'尚未检查';}
