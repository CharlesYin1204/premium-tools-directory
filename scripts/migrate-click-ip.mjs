import {pool} from '../lib/db.js';import {migrateClickIp} from '../lib/click-ip.js';
try{await migrateClickIp(pool);console.log('IP统计隔离标识表已就绪；历史不回填，采集默认关闭');}finally{await pool.end();}
