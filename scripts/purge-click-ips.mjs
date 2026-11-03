import {pool} from '../lib/db.js';import {purgeClickIps} from '../lib/click-ip.js';
try{console.log(JSON.stringify({expiredIdentifiersDeleted:await purgeClickIps(pool)}));}finally{await pool.end();}
