import {NextResponse} from 'next/server';
import {getPublic} from '../../../lib/resources.js';
import {toolSearchAvailable} from '../../../lib/ai.js';
import {rankReviewed} from '../../../lib/ai-retrieval.js';
import {reviewedItemsWithCovers} from '../../../lib/ai-scope.js';
import {rateLimit,checkOrigin,AppError} from '../../../lib/security.js';
export const dynamic='force-dynamic';
export async function POST(request){try{
 checkOrigin(request);await rateLimit('ai-movie-search:'+(request.headers.get('x-real-ip')||'unknown'),8,3600);
 const feature=await toolSearchAvailable();if(!feature.movie_search_enabled)throw new AppError(503,'AI 工具推荐尚未启用，请管理员完成模型配置');
 const max=feature.max_image_mb*1024*1024+16384;
 if(Number(request.headers.get('content-length'))>max)throw new AppError(413,'上传内容过大');
 const chunks=[];let size=0;const reader=request.body?.getReader();if(!reader)throw new AppError(422,'请描述工具需求或上传截图');
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new AppError(413,'上传内容过大');}chunks.push(value);}}finally{reader.releaseLock();}
 let form;try{form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();}catch{throw new AppError(422,'上传格式不正确');}
 const image=form.get('image'),description=String(form.get('description')||'').trim();
 if(description.length>500)throw new AppError(422,'需求描述不能超过 500 字');
 if(image!==null&&(!(image instanceof File)||!image.size))throw new AppError(422,'截图文件无效');
 if(!image&&!description)throw new AppError(422,'请描述工具需求或上传截图');
 if(image&&!feature.image_available)throw new AppError(503,'截图识别模型尚未配置，请先使用文字描述需求');
 if(!image&&!feature.text_available)throw new AppError(503,'文字模型尚未配置，请联系管理员');
 if(!feature.available)throw new AppError(503,'AI 模型尚未配置，请联系管理员');
 const data=await getPublic();
 const result=await rankReviewed(data,description,{kind:'entries',image});
 const live=new Set((await reviewedItemsWithCovers(data,'entries')).map(i=>i.id));
 return NextResponse.json({intent:result.intent,results:result.results.filter(i=>live.has(i.id)).map(i=>({id:i.id,slug:i.slug,name:i.name,description:i.description,icon_url:i.icon_url,reason:i.reason}))},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({message:error.status?error.message:'AI 工具推荐暂时无法完成，请稍后重试'},{status:error.status||503,headers:{'Cache-Control':'no-store'}});}}
