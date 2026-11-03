import {query,pool} from '../lib/db.js';
try{const columns=await query('SHOW COLUMNS FROM resources');if(!columns.some(c=>c.Field==='manual_excluded')){await query('ALTER TABLE resources ADD COLUMN manual_excluded BOOLEAN NOT NULL DEFAULT FALSE');console.log('Added resources.manual_excluded');}}finally{await pool.end();}
