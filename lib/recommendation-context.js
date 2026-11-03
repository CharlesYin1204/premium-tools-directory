import {eventResourceMode} from './event-resource-mode.js';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {recommendContents} from './recommendations.js';
import {videoDetailConfig} from './video-detail-config.js';
import {eventTimePolicy} from './event-time.js';
const keyFromEnv=()=>process.env.RECOMMENDATION_SIGNING_KEY;
const validKey=key=>typeof key==='string'&&/^[a-f0-9]{64}$/i.test(key);
const digest=(value,key)=>createHmac('sha256',Buffer.from(key,'hex')).update(value).digest();
export function recommendationTokens(content,data,at=Date.now(),key=keyFromEnv()){
 if(!validKey(key)||!data.site.analytics_enabled)return {};
 const result=recommendContents(content,data.contents,videoDetailConfig(data.site),at);
 return Object.fromEntries(result.items.map(({item},index)=>{
  const snapshot={v:1,source_id:content.id,target_id:item.id,source_title:content.title,target_title:item.title,rule_id:result.rule_id,position:index+1,evaluated_at:at,expires_at:at+eventTimePolicy().max_delay_hours*3600000};
  const body=Buffer.from(JSON.stringify(snapshot)).toString('base64url');return [item.id,body+'.'+digest(body,key).toString('base64url')];
 }));
}
// A signature proves the server rendered this recommendation, not human attention.
export function recommendationClickContext(token,targetId,data,now=Date.now(),key=keyFromEnv()){
 if(!validKey(key)||typeof token!=='string'||token.length>4096)return null;
 const parts=token.split('.');if(parts.length!==2||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)))return null;
 const signature=Buffer.from(parts[1],'base64url'),expected=digest(parts[0],key);if(signature.length!==expected.length||!timingSafeEqual(signature,expected))return null;
 let p;try{p=JSON.parse(Buffer.from(parts[0],'base64url').toString());}catch{return null;}
 if(p?.v!==1||p.target_id!==targetId||!Number.isSafeInteger(p.evaluated_at)||!Number.isSafeInteger(p.expires_at)||p.evaluated_at>now||p.expires_at<=now||!Number.isInteger(p.position)||p.position<1||p.position>12||typeof p.rule_id!=='string'||p.rule_id.length>160)return null;
 const source=data.contents.find(c=>c.id===p.source_id&&c.type==='video'),target=data.contents.find(c=>c.id===targetId&&c.type==='video');
 if(!source||!target||source.id===target.id||[source,target].some(c=>c.revoked||c.manual_excluded||c.has_published===false||c.available===false||c.rights_status&&c.rights_status!=='approved'))return null;
 return {resource_mode:eventResourceMode(source,target),content_id:target.id,recommendation_source_id:source.id,recommendation_rule:p.rule_id,recommendation_position:p.position,recommendation_snapshot:p,page:'/video/'+source.slug};
}
