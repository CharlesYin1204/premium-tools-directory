import {query,decode} from './db.js';
export const contentHistorySchema=`CREATE TABLE IF NOT EXISTS content_history(resource_id VARCHAR(36) NOT NULL,version INT NOT NULL,payload JSON NOT NULL,status VARCHAR(20) NOT NULL,action VARCHAR(40) NOT NULL,actor VARCHAR(80) NOT NULL,created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),PRIMARY KEY(resource_id,version))`;
let schema;
export function ensureContentHistory(){return schema||(schema=query(contentHistorySchema).catch(error=>{schema=null;throw error;}));}
export async function recordContentHistory(row,action,actor,db){if(row?.kind!=='contents')return;await query('INSERT IGNORE INTO content_history(resource_id,version,payload,status,action,actor,created_at) VALUES(?,?,?,?,?,?,?)',[row.id,row.version,JSON.stringify(decode(row.draft)),row.status,action,actor,row.updated_at||new Date()],db);}
export function restoredContent(snapshot,current){return {...snapshot,source_system:current.source_system,source_id:current.source_id,rights_status:current.rights_status,rights_note:current.rights_note};}
