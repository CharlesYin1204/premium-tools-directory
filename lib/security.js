import {isLocalContentTarget} from './local-content-target.js';
import {can} from './permissions.js';
import {lookup} from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers.js';
import {query} from './db.js';
export class AppError extends Error{constructor(status,message,fields={}){super(message);this.status=status;this.fields=fields;}}
export const hash=s=>createHash('sha256').update(s).digest('hex');
export function passwordHash(s){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(s,salt,64).toString('hex');}
export function verifyPassword(s,h){const [salt,v]=h.split(':');const b=Buffer.from(v,'hex');return b.length===64&&timingSafeEqual(scryptSync(s,salt,64),b);}
export async function user(){const token=(await cookies()).get('bd_session')?.value;if(!token)return null;const rows=await query('SELECT a.id,a.username,a.name,a.role FROM sessions s JOIN admins a ON a.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() AND a.enabled=1',[hash(token)]);return rows[0]||null;}
export async function requireUser(action='read'){const u=await user();if(!u)throw new AppError(401,'登录已过期，请重新登录');if(!can(u.role,action))throw new AppError(403,'当前账号没有此操作权限');return u;}
export async function rateLimit(key,max=100,seconds=60){const bucket=hash(key);await query('INSERT INTO rate_limits(bucket,hits,expires_at) VALUES(?,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE hits=IF(expires_at<UTC_TIMESTAMP(),1,hits+1),expires_at=IF(expires_at<UTC_TIMESTAMP(),VALUES(expires_at),expires_at)',[bucket,seconds]);const [r]=await query('SELECT hits FROM rate_limits WHERE bucket=?',[bucket]);if(r.hits>max)throw new AppError(429,'操作过于频繁，请稍后重试');}
export function checkOrigin(req){const origin=req.headers.get('origin');if(origin&&origin!==new URL(process.env.PUBLIC_URL).origin&&origin!==new URL(req.url).origin)throw new AppError(403,'请求来源不匹配，请从本站操作');}
export function publicAddress(s){try{let a=ipaddr.parse(s);if(a.kind()==='ipv6'&&a.isIPv4MappedAddress())a=a.toIPv4Address();return a.range()==='unicast';}catch{return false;}}
export async function safeUrl(s,field='target_url'){if(field==='target_url'&&isLocalContentTarget(s))return s;if(['icon_url','logo_url','cover_url','play_url','chapters'].includes(field)&&typeof s==='string'&&/^\/media\/[a-zA-Z0-9_/-]+\.(png|jpe?g|webp|gif|avif|webm|mp4)$/.test(s)&&!s.includes('..'))return s;let u;try{u=new URL(s);}catch{throw new AppError(422,'请检查链接地址',{[field]:'请输入完整的 HTTP / HTTPS 地址'});}if(s.length>2048||!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port&&!['80','443'].includes(u.port))throw new AppError(422,'链接不符合要求',{[field]:'仅允许公共 HTTP / HTTPS 地址，不允许凭据或非标准端口'});const host=u.hostname.replace(/^\[|\]$/g,'');let addresses;try{addresses=await lookup(host,{all:true});}catch{throw new AppError(422,'链接域名无法解析',{[field]:'域名无法解析，请核对网址'});}if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new AppError(422,'不允许内网或回环目标',{[field]:'请使用公网目标地址'});return u.toString();}
