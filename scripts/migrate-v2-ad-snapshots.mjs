import {query,pool} from '../lib/db.js';
// Additive only. Unknown historical metadata must stay NULL.
export const adEventColumns={ad_name:'VARCHAR(100)',ad_type:'VARCHAR(16)',slot_id:'VARCHAR(160)',creative_version:'INT UNSIGNED',ad_snapshot:'JSON'};
try{const existing=new Set((await query('SHOW COLUMNS FROM events')).map(c=>c.Field));for(const [name,type] of Object.entries(adEventColumns))if(!existing.has(name)){await query(`ALTER TABLE events ADD COLUMN ${name} ${type} NULL`);console.log('Added events.'+name);}}finally{await pool.end();}
