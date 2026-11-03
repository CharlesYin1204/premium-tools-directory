import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';
import {AppError} from './security.js';
import {parseSpreadsheet} from './import-spreadsheet.js';
const directory=path.join(process.cwd(),'storage','import-files');
export async function saveImportFile(req,user){
 const kind=new URL(req.url).searchParams.get('kind');
 if(!['entries','categories','companies'].includes(kind))throw new AppError(422,'不支持此导入类型');
 let name;try{name=decodeURIComponent(req.headers.get('x-file-name')||'');}catch{throw new AppError(422,'文件名无效');}
 name=name.split(/[\\/]/).pop();
 if(!name||name.length>200||!/\.(csv|xlsx)$/i.test(name)||/[\x00-\x1f]/.test(name))throw new AppError(422,'请选择CSV或XLSX文件');
 if(Number(req.headers.get('content-length'))>1024*1024)throw new AppError(413,'文件不能超过1MB');
 const reader=req.body?.getReader();if(!reader)throw new AppError(422,'文件为空');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024*1024){await reader.cancel();throw new AppError(413,'文件不能超过1MB');}chunks.push(value);}}finally{reader.releaseLock();}
 if(!size)throw new AppError(422,'文件为空');
 const bytes=Buffer.concat(chunks),id=randomUUID();
 const extension=path.extname(name).slice(1).toLowerCase();
 const metadata={id,kind,name,extension,size,sha256:createHash('sha256').update(bytes).digest('hex'),owner:user.id,uploaded_at:new Date().toISOString()};
 let parsed=null,parse_error=null,sheets;
 try{({parsed,parse_error=null,sheets}=await parseSpreadsheet(bytes,extension));}catch(e){parse_error=e instanceof TypeError?'文件编码不是UTF-8，请另存为UTF-8 CSV后上传':e.message;}
 await mkdir(directory,{recursive:true,mode:0o700});
 await writeFile(path.join(directory,id+'.'+extension),bytes,{mode:0o600,flag:'wx'});
 try{await writeFile(path.join(directory,id+'.json'),JSON.stringify({...metadata,parse_error}),{mode:0o600,flag:'wx'});}catch(e){await rm(path.join(directory,id+'.'+extension),{force:true});throw e;}
 console.info('Import file uploaded',JSON.stringify({upload_id:id,kind,size,rows:parsed?.rows.length??null,parse_error}));
 return {...metadata,owner:undefined,parsed,parse_error,sheets};
}
export async function readImportFile(id,user,kind){
 if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))throw new AppError(422,'上传文件编号无效');
 let metadata;try{metadata=JSON.parse(await readFile(path.join(directory,id+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')throw new AppError(404,'上传文件不存在');throw e;}
 if(metadata.owner!==user.id&&user.role!=='super')throw new AppError(403,'无权读取此上传文件');
 if(kind&&metadata.kind!==kind)throw new AppError(422,'上传文件的资源类型不匹配');
 return {metadata,bytes:await readFile(path.join(directory,id+'.'+(metadata.extension==='xlsx'?'xlsx':'csv')))};
}
