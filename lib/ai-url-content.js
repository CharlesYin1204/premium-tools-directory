import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {approvedMetadataUrl} from './ai-scope.js';
import {publicAddress,AppError} from './security.js';
export function htmlText(html){return html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/g,v=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>'}[v])).replace(/\s+/g,' ').trim().slice(0,14000);}
export async function readApprovedPage(value,deadline=Date.now()+15000,hops=0){
 let url;try{url=approvedMetadataUrl(value);}catch(e){throw new AppError(422,e.message);}
 if(hops>3||Date.now()>deadline)throw new AppError(422,'页面重定向过多或读取超时');
 let addresses;try{addresses=await lookup(url.hostname,{all:true});}catch{throw new AppError(422,'网址域名无法解析');}
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new AppError(422,'只允许访问公网网址');
 const addr=addresses[0];
 const result=await new Promise((resolve,reject)=>{
 const req=https.request(url,{method:'GET',headers:{Accept:'text/html','User-Agent':'PremiumToolsMetadata/1.0'},lookup:(_host,options,cb)=>options.all?cb(null,[addr]):cb(null,addr.address,addr.family)},res=>{
 if([301,302,303,307,308].includes(res.statusCode)){res.resume();resolve({redirect:res.headers.location});return;}
 if(res.statusCode!==200||!String(res.headers['content-type']).includes('text/html')){res.resume();reject(new AppError(422,'页面不可读取或不是 HTML 网页'));return;}
 const chunks=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>1024*1024){req.destroy(new AppError(413,'网页内容超过 1 MB，无法自动识别'));return;}chunks.push(chunk);});res.on('end',()=>resolve({url:url.toString(),text:htmlText(Buffer.concat(chunks).toString('utf8'))}));res.on('error',reject);
 });const timer=setTimeout(()=>req.destroy(new AppError(504,'读取网址超时')),Math.max(1,deadline-Date.now()));req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
 });
 if(result.redirect)return readApprovedPage(new URL(result.redirect,url).toString(),deadline,hops+1);
 if(!result.text)throw new AppError(422,'页面没有可识别正文，请手动填写');return result;
}
