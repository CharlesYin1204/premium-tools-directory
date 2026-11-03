import {pool} from '../lib/db.js';import {migrateRecommendationEvents} from '../lib/recommendation-event-schema.js';
try{console.log({added:await migrateRecommendationEvents(pool),historicalRowsUnchanged:true});}finally{await pool.end();}
