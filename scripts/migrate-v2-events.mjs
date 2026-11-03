import {query,pool} from '../lib/db.js';
// Additive and restartable; old events remain unknown, never infer past platforms.
try {
 const existing=new Set((await query('SHOW COLUMNS FROM events')).map(c=>c.Field));
 for(const [name,size] of [['action_mode',16],['os',16],['target_platform',16],['fallback_reason',40]]){
  if(!existing.has(name)){await query(`ALTER TABLE events ADD COLUMN ${name} VARCHAR(${size}) NULL`);console.log('Added events.'+name);}
 }
} finally {await pool.end();}
