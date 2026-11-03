import {NextResponse} from 'next/server';
import {getPublic} from '../../../lib/resources.js';
import {checkOrigin,rateLimit,AppError} from '../../../lib/security.js';
import {readJsonObject} from '../../../lib/api-contract.js';
import {rankReviewed} from '../../../lib/ai-retrieval.js';
import {reviewedItems} from '../../../lib/ai-scope.js';
export const dynamic='force-dynamic';
export async function POST(request){try{
 checkOrigin(request);await rateLimit('ai-directory:'+(request.headers.get('x-real-ip')||'unknown'),15,3600);
 const body=await readJsonObject(request,4096),q=typeof body.q==='string'?body.q.trim():'';
 if(!q||q.length>500)throw new AppError(422,'请用 1–500 字描述需求');
 const result=await rankReviewed(await getPublic(),q);
 const live=new Set(reviewedItems(await getPublic(),'entries').map(i=>i.id));
 return NextResponse.json({intent:result.intent,results:result.results.filter(i=>live.has(i.id)).map(i=>({id:i.id,name:i.name,description:i.description,url:i.target_url,reason:i.reason}))},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({message:e.status?e.message:'AI 搜索暂时不可用'},{status:e.status||503,headers:{'Cache-Control':'no-store'}});}}
