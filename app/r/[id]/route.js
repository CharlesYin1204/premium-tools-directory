import {isClickRequest} from '../../../lib/click-request';
import {after} from 'next/server';
import {randomUUID} from 'node:crypto';
import {getPublic} from '../../../lib/resources';
import {recommendationClickContext} from '../../../lib/recommendation-context';
import {scheduleClick} from '../../../lib/click-delivery';
import {event,health} from '../../../lib/analytics';
import {serverEventTime} from '../../../lib/event-time';
import {escapeHtml} from '../../../lib/entry-target';
export const dynamic='force-dynamic';
async function redirect(req,{params},track){
 const receivedAt=Date.now();
 try{
  const {id}=await params,data=await getPublic(),target=data.contents.find(c=>c.id===id&&c.type==='video');
  if(!target)return unavailable('此推荐内容已下架或暂不可用',410);
  const q=new URL(req.url).searchParams,context=recommendationClickContext(q.get('context'),id,data,receivedAt);
  if(track&&context&&data.site.analytics_enabled&&isClickRequest(req)){const supplied=q.get('event_id');scheduleClick(after,payload=>event(payload,serverEventTime(receivedAt)),health,{...context,event_name:'recommendation_click',event_id:supplied&&/^[a-zA-Z0-9-]{16,80}$/.test(supplied)?supplied:randomUUID(),page_view_id:q.get('page_view_id'),session_id:(q.get('session_id')||'').slice(0,80),device:q.get('device')==='h5'?'h5':'pc',channel:(q.get('channel')||'direct').slice(0,100),is_test:q.get('test')==='1'||/bot|spider|crawler|headless/i.test(req.headers.get('user-agent')||'')});}
  // Expired/tampered context affects attribution only. The destination is always a current public record.
  return new Response(null,{status:302,headers:{Location:'/video/'+encodeURIComponent(target.slug),'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
 }catch{return unavailable('暂时无法读取推荐内容，请稍后重试',503);}
}

export async function GET(req,context){return redirect(req,context,true);}
export async function HEAD(req,context){return redirect(req,context,false);}
function unavailable(message,status){return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>推荐内容暂不可用</title><body style="font-family:system-ui;background:#faf9f5;color:#253d33;display:grid;place-items:center;min-height:95vh"><main style="text-align:center;padding:28px;max-width:640px"><h1>${escapeHtml(message)}</h1><p>你可以返回视频列表，继续发现其他内容。</p><a href="/videos" style="display:inline-block;padding:14px 28px;background:#264f3b;color:white;border-radius:10px;text-decoration:none">返回视频列表</a></main></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});}
