import {query,decode,transaction} from './db.js';import {allRows,resource,publicData} from './resources.js';import {publishRuleConfig,publishRulePreview} from './publish-rule-preview.js';import {AppError} from './security.js';
export async function migratePublishRules(db){await db.query("CREATE TABLE IF NOT EXISTS sync_publish_rules(id VARCHAR(16) PRIMARY KEY,config JSON NOT NULL,version INT NOT NULL DEFAULT 1,preview_hash CHAR(64) NOT NULL,updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");}
export async function publishRules(){return (await query('SELECT * FROM sync_publish_rules ORDER BY id')).map(r=>({...r,config:decode(r.config)}));}
async function preview(config,db){const rows=await allRows(db),sources=await query('SELECT * FROM source_records ORDER BY source_system,source_id',[],db);const live=publicData(rows);return publishRulePreview(config,rows.map(r=>resource(r)),sources.map(s=>({...s,payload:decode(s.payload)})),[...live.companies,...live.categories,...live.entries,live.site]);}
export async function previewPublishRule(body){const config=publishRuleConfig(body.config);return transaction(db=>preview(config,db));}
export async function savePublishRule(body,user){
 if(user.role!=='super')throw new AppError(403,'仅超级管理员可保存自动发布规则');const config=publishRuleConfig(body.config);
 if(!Number.isInteger(body.version)||body.version<0||typeof body.snapshot!=='string')throw new AppError(422,'请先预览当前规则');
 return transaction(async db=>{await query("SELECT id FROM resources WHERE id='site' FOR UPDATE",[],db);const [old]=await query('SELECT * FROM sync_publish_rules WHERE id=? FOR UPDATE',[config.type],db);if((old?.version||0)!==body.version)throw new AppError(409,'规则已被修改，请刷新后重新预览');
  const result=await preview(config,db);if(result.snapshot!==body.snapshot)throw new AppError(409,'候选、发布条件或规则已变化，请重新预览');
  await query('INSERT INTO sync_publish_rules(id,config,preview_hash) VALUES(?,?,?) ON DUPLICATE KEY UPDATE config=VALUES(config),preview_hash=VALUES(preview_hash),version=version+1',[config.type,JSON.stringify(config),result.snapshot],db);
  await query('INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)',[user.username,'publish_rule_draft',config.type,JSON.stringify({version:body.version+1,config,preview_hash:result.snapshot,total:result.total,selected:result.selected})],db);
  return {id:config.type,version:body.version+1,enabled:false};
 });
}
