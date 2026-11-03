import {requireUser,checkOrigin,rateLimit} from '../../../../lib/security.js';
import {saveImportFile,readImportFile} from '../../../../lib/import-files.js';
export const dynamic='force-dynamic';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
function failure(e){if(!e.status)console.error('Import file storage failed',e.code||e.name);return json({message:e.status?e.message:'文件保存失败，请重试'},e.status||500);}
export async function POST(req){try{checkOrigin(req);const user=await requireUser('write');await rateLimit('import-file:'+user.id,60,3600);return json(await saveImportFile(req,user));}catch(e){return failure(e);}}
export async function GET(req){try{const user=await requireUser('write');const {metadata,bytes}=await readImportFile(new URL(req.url).searchParams.get('id'),user);return new Response(bytes,{headers:{'Content-Type':metadata.extension==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="import.${metadata.extension==='xlsx'?'xlsx':'csv'}"; filename*=UTF-8''${encodeURIComponent(metadata.name)}`,'Content-Length':String(bytes.length),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch(e){return failure(e);}}
