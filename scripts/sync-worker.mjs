import {enqueueDueSchedule} from '../lib/sync-scheduler.js';
import {setTimeout as delay} from 'node:timers/promises';
import {pool,query} from '../lib/db.js';
import {nextSyncJob} from '../lib/sync-queue.js';
import {runSync} from '../lib/laosiji-sync.js';
let stopping=false,beating=false;
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stopping=true;});
async function beat(){if(beating)return;beating=true;try{await query("INSERT INTO system_health(name,message,updated_at) VALUES('sync_worker','同步执行进程心跳',UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE message=VALUES(message),updated_at=UTC_TIMESTAMP()");}catch{console.error('Sync worker heartbeat unavailable');}finally{beating=false;}}
await beat();const heartbeat=setInterval(beat,15000);
try{while(!stopping){try{await enqueueDueSchedule();}catch{console.error('Sync schedule check unavailable; existing queued jobs remain eligible');}try{const id=await nextSyncJob();if(id)await runSync(id);}catch{console.error('Sync worker queue unavailable; retrying after bounded poll interval');}if(!stopping)await delay(3000);}}
finally{clearInterval(heartbeat);await pool.end();}
