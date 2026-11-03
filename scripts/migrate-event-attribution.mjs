import {pool} from '../lib/db.js';import {migrateAttribution} from '../lib/event-attribution-schema.js';
try{console.log({added:await migrateAttribution(pool),historicalRowsUnchanged:true});}finally{await pool.end();}
