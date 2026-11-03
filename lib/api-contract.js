// Match complete endpoints before parsing input or entering a mutation handler.
export function apiMethods(path,kinds=[]){
 if(['auth/login','auth/logout','auth/password','events'].includes(path))return ['POST'];
 if(['auth/me','public','admin/bootstrap','admin/report','admin/audit','admin/impact','admin/revisions','admin/content-history','admin/ad-history','admin/preview','admin/import-template'].includes(path))return ['GET'];
 if(['admin/users','admin/sync','admin/ai','admin/import',...kinds.map(kind=>'admin/'+kind)].includes(path))return ['GET','POST'];
 return null;
}
function invalid(status,message){return Object.assign(new Error(message),{status});}
export async function readJsonObject(req,limit=1024*1024){
 if(Number(req.headers.get('content-length'))>limit)throw invalid(413,'请求内容超过 1 MB');
 const reader=req.body?.getReader();if(!reader)throw invalid(400,'请求内容格式不正确');
 const chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();throw invalid(413,'请求内容超过 1 MB');}chunks.push(value);}}
 finally{reader.releaseLock();}
 let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw invalid(400,'请求内容格式不正确');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw invalid(400,'请求内容必须是 JSON 对象');
 if(Object.hasOwn(body,'batch')&&(!Array.isArray(body.batch)||!body.batch.length||body.batch.length>50||body.batch.some(item=>!item||typeof item!=='object'||Array.isArray(item)||typeof item.id!=='string'||!item.id.trim()||item.id.length>100)))throw invalid(422,'批量操作须包含 1–50 个有效资源对象');
 return body;
}
