import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';import ipaddr from 'ipaddr.js';
export function ipPolicy(env=process.env){
 if(env.IP_ANALYTICS_ENABLED!=='true')return {status:'disabled'};
 const retention=Number(env.IP_ANALYTICS_RETENTION_DAYS),window=Number(env.IP_ANALYTICS_WINDOW_DAYS),version=env.IP_ANALYTICS_KEY_VERSION,approval=env.IP_ANALYTICS_POLICY_REF,key=env.IP_ANALYTICS_KEY,proxy=env.IP_ANALYTICS_PROXY_TOKEN;
 if(!Number.isInteger(retention)||retention<1||retention>90||!Number.isInteger(window)||window<1||window>retention||!/^[A-Za-z0-9_-]{1,32}$/.test(version||'')||typeof approval!=='string'||!approval.trim()||approval.length>120||!/^[a-f0-9]{64}$/i.test(key||'')||!/^[a-f0-9]{64}$/i.test(proxy||''))return {status:'invalid'};
 return {status:'enabled',retention_days:retention,window_days:window,key_version:version+'-'+createHash('sha256').update(Buffer.from(key,'hex')).digest('hex').slice(0,16),policy_ref:approval};
}
export function normalizeClientIp(value){
 if(typeof value!=='string'||value.includes('%')||!isIP(value))return null;
 let ip=ipaddr.parse(value);if(ip.kind()==='ipv6'&&ip.isIPv4MappedAddress())ip=ip.toIPv4Address();return ip.toString();
}
export function clickIpIdentity(req,at=Date.now(),env=process.env){
 const policy=ipPolicy(env);if(policy.status!=='enabled')return null;
 const supplied=req.headers.get('x-navigation-proxy-token')||'',expected=env.IP_ANALYTICS_PROXY_TOKEN;
 if(!/^[a-f0-9]{64}$/i.test(supplied)||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return null;
 // These two headers must be overwritten by the trusted edge; never trust XFF.
 const ip=normalizeClientIp(req.headers.get('x-navigation-client-ip'));if(!ip)return null;
 return {hash:createHmac('sha256',Buffer.from(env.IP_ANALYTICS_KEY,'hex')).update(ip).digest('hex'),version:policy.key_version,expires_at:new Date(at+policy.retention_days*86400000).toISOString().slice(0,23).replace('T',' ')};
}
export async function migrateClickIp(db){await db.query(`CREATE TABLE IF NOT EXISTS event_ip_identities (event_id VARCHAR(80) NOT NULL PRIMARY KEY,ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,key_version VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,expires_at DATETIME(3) NOT NULL,KEY expires_at(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);}
export async function saveClickIp(db,eventId,identity){if(identity)await db.execute('INSERT IGNORE INTO event_ip_identities(event_id,ip_hash,key_version,expires_at) VALUES(?,?,?,?)',[eventId,identity.hash,identity.version,identity.expires_at]);}
export async function purgeClickIps(db){const [r]=await db.execute('DELETE FROM event_ip_identities WHERE expires_at<=UTC_TIMESTAMP(3) LIMIT 10000');return r.affectedRows;}
export function ipCount(row){return Number(row.known)===Number(row.clicks)&&Number(row.versions)<=1?Number(row.distinct_ips):null;}
export async function ipClickReport(db,range,now=Date.now(),env=process.env){
 const policy=ipPolicy(env),empty={policy,summary:null,rows:[]};if(policy.status!=='enabled')return empty;
 const earliest=new Date(now+8*3600000-(policy.window_days-1)*86400000).toISOString().slice(0,10);
 if(range.start<earliest)return {...empty,status:'outside_window'};
 const select='COUNT(*) clicks,COUNT(i.ip_hash) known,COUNT(DISTINCT i.key_version) versions,COUNT(DISTINCT i.ip_hash) distinct_ips';
 const from=`FROM events e LEFT JOIN event_ip_identities i ON i.event_id=e.event_id AND i.expires_at>UTC_TIMESTAMP(3) WHERE ${range.where} AND event_name='entry_click'`;
 const [[summary]]=await db.execute(`SELECT ${select} ${from}`,range.values);
 const [rows]=await db.execute(`SELECT entry_id,placement_id,MAX(entry_name) entry_name,MAX(ad_name) ad_name,${select} ${from} GROUP BY entry_id,placement_id ORDER BY clicks DESC,entry_id,placement_id`,range.values);
 const decorate=row=>({...row,unique_ips:ipCount(row),unknown:row.clicks-row.known,status:row.versions>1?'密钥跨期，无法全期去重':row.known<row.clicks?'部分点击无可用标识':'完整',distinct_ips:undefined});
 return {policy,status:'available',summary:decorate(summary),rows:rows.map(row=>({...decorate(row),ad_name:row.placement_id?(row.ad_name||'旧版 / 未知'):'普通导航'}))};
}
