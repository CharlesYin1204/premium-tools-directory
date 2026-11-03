import {createCipheriv,createDecipheriv} from 'node:crypto';
export const sourcePaths={domains:'/system/domains',videoSearch:'/movie/search',videoDetail:'/movie/detail',comicSearch:'/comics/search',comicDetail:'/comics/detail'};
// The documented PHP OpenSSL call uses a raw AES key (zero-padded/truncated to 16 bytes).
function aesKey(key){const bytes=Buffer.from(key,'utf8'),out=Buffer.alloc(16);bytes.copy(out,0,0,16);return out;}
export function encryptPayload(payload,key){const cipher=createCipheriv('aes-128-ecb',aesKey(key),null);return Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final()]).toString('base64');}
export function decryptPayload(value,key){if(typeof value!=='string'||!value.length||value.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('Invalid encrypted payload');const decipher=createDecipheriv('aes-128-ecb',aesKey(key),null);return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value,'base64')),decipher.final()]).toString('utf8'));}
export function parseSearch(value,type){
 // need_total_info=n: movie schema wraps records in data; comics describes each record.
 const items=Array.isArray(value)?value:type==='video'&&Array.isArray(value?.data)?value.data:null;
 if(!items||items.some(x=>!x||typeof x!=='object'||typeof x.id!=='string'||!x.id||x.id.length>100))throw Error('Upstream list contract mismatch');
 return items;
}
export function sourceSystem(type){return type==='video'?'laosiji-video':'laosiji-comic';}
export function mapSource(type,item,config){
 if(!item||typeof item.id!=='string'||!item.id||item.id.length>100||typeof item.name!=='string'||!item.name.trim())throw Error('Missing upstream id or name');
 const image=path=>{
  if(!path||!config.image_cdn)return '';
  if(typeof path!=='string'||/\.bnc(?:[?#]|$)/i.test(path))return '';
  let pathname;try{pathname=new URL(path,'https://source.invalid').pathname;}catch{return '';}
  if(!/\.(png|jpe?g|webp|gif|avif)$/i.test(pathname))return '';
  const base=new URL(config.image_cdn);base.pathname=base.pathname.replace(/\/$/,'')+'/'+pathname.replace(/^\//,'');base.search='';base.hash='';return base.toString();
 };
 const tags=[...new Set((Array.isArray(item.tags)?item.tags:[]).map(t=>t?.name).filter(t=>typeof t==='string'&&t.trim()))].slice(0,10);
 const d={title:item.name,summary:typeof item.description==='string'?item.description:'',type,source_system:sourceSystem(type),source_id:item.id,company_id:config.company_id||'',category_ids:config.category_ids||[],entry_ids:[],tags,brand:'',rights_status:'unknown',rights_note:'',sort_order:0,cover_url:image(type==='video'?item.img_x||item.img_y:item.img),play_url:'',media_format:type==='video'?'hls':'',chapters:[]};
 if(type==='comic'){
  if(item.chapter!==undefined&&!Array.isArray(item.chapter))throw Error('Invalid upstream chapters');
  d.chapters=(item.chapter||[]).map(c=>{if(typeof c.name!=='string'||!Array.isArray(c.content))throw Error('Invalid upstream chapter');return {title:c.name,pages:c.content.map(p=>image(p.f))};});
 }
 // Never expose an internal/free CDN or guess a signed playback URL from raw source links.
 return d;
}
