import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {requireUser,checkOrigin,rateLimit,AppError} from '../../../../lib/security.js';
import {boundedForm,convertImage,uploadDirectory,uploadPath} from '../../../../lib/uploads.js';
import {query} from '../../../../lib/db.js';
export const runtime='nodejs';
export async function POST(req){let filePath;try{checkOrigin(req);const u=await requireUser('write');await rateLimit('upload:'+u.id,80,60);const form=await boundedForm(req),file=form.get('file'),purpose=form.get('purpose');if(!(file instanceof File))throw new AppError(422,'请选择图片文件',{file:'图片为必填项'});const output=await convertImage(Buffer.from(await file.arrayBuffer()),purpose);const name=randomUUID()+'.webp';filePath=uploadPath(name);await mkdir(uploadDirectory,{recursive:true});await writeFile(filePath,output,{flag:'wx',mode:0o640});await query('INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)',[u.username,'image_upload',null,JSON.stringify({purpose,url:'/media/uploads/'+name,bytes:output.length})]);return NextResponse.json({url:'/media/uploads/'+name,bytes:output.length,type:'image/webp'},{status:201});}catch(e){if(filePath)await unlink(filePath).catch(()=>{});return NextResponse.json({message:e.status?e.message:'图片上传失败，请稍后重试',field_errors:e.fields||{},request_id:randomUUID()},{status:e.status||503});}}
