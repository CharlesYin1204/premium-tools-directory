import {query,pool} from '../lib/db.js';
await query("CREATE TABLE IF NOT EXISTS integration_configs(name VARCHAR(60) PRIMARY KEY,config JSON NOT NULL,secret TEXT,version INT NOT NULL DEFAULT 1,check_status VARCHAR(30) DEFAULT 'not_checked',checked_at DATETIME NULL,updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
for(const [name,definition] of [['lease_until','DATETIME NULL'],['worker_token','VARCHAR(36) NULL']]){const [row]=await query('SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?',['sync_jobs',name]);if(!row.n)await query('ALTER TABLE sync_jobs ADD COLUMN '+name+' '+definition);}
console.log('业务接入配置和任务租约结构已就绪，未写入业务凭据或内容');await pool.end();
