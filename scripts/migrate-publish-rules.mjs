import {pool} from '../lib/db.js';import {migratePublishRules} from '../lib/publish-rules.js';try{await migratePublishRules(pool);console.log('发布规则草稿表就绪；未创建或启用任何规则');}finally{await pool.end();}
