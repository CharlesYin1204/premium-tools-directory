import {pool} from '../lib/db.js';import {migrateEventTime} from '../lib/event-time-schema.js';
try{console.log({added:await migrateEventTime(pool),historicalRowsUnchanged:true});}finally{await pool.end();}
