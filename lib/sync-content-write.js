import {query,decode} from './db.js';
import {mergeSyncedContent} from './synced-content.js';
export async function updateSyncedResource(existing,mapped,priorMapped,available,db){
 const draft=mergeSyncedContent(decode(existing.draft),mapped,priorMapped),visible=!!available&&!existing.manual_excluded;
 await query("UPDATE resources SET draft=?,version=version+1,published=IF(?,published,NULL),status=IF(?,status,'offline') WHERE id=?",[JSON.stringify(draft),visible,visible,existing.id],db);
 return {wentOffline:!!existing.published&&!visible};
}
