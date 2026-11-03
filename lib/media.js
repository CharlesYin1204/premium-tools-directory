import http from 'node:http';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {uploadPath} from './uploads.js';
import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {safeUrl,publicAddress,AppError} from './security.js';
export async function checkMedia(url,field='play_url',redirects=0){
 await safeUrl(url,field);if(url.startsWith('/media/')){const file=url.startsWith('/media/uploads/')?uploadPath(url.slice('/media/uploads/'.length)):path.join(process.cwd(),'public',url);try{const s=await stat(file);if(!s.isFile()||s.size===0)throw Error();return {status:200,type:field==='play_url'?'video/webm':'image/png'};}catch{throw new AppError(422,'本站媒体文件不存在',{[field]:'请重新上传媒体文件'});}}const u=new URL(url);const addresses=await lookup(u.hostname,{all:true});if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new AppError(422,'媒体地址不可用',{[field]:'媒体必须位于公网'});const addr=addresses[0];
 const result=await new Promise((resolve,reject)=>{const req=(u.protocol==='https:'?https:http).request(u,{method:'GET',headers:{Range:'bytes=0-0','User-Agent':'PremiumToolsMediaValidator/1.0'},lookup:(_h,opts,cb)=>cb(null,opts.all?[{address:addr.address,family:addr.family}]:addr.address,addr.family),timeout:8000},res=>{const result={status:res.statusCode,type:res.headers['content-type']||'',location:res.headers.location};res.destroy();resolve(result);});req.on('timeout',()=>req.destroy(Error('timeout')));req.on('error',reject);req.end();}).catch(()=>{throw new AppError(422,'无法验证媒体可用性',{[field]:'媒体连接失败或超时，请检查来源'});});
 if(result.status>=300&&result.status<400&&result.location&&redirects<3)return checkMedia(new URL(result.location,u).toString(),field,redirects+1);
 if(result.status<200||result.status>=300)throw new AppError(422,'媒体不可访问',{[field]:`媒体返回 HTTP ${result.status}，请更新地址`});
 if(field==='play_url'&&!/video\/|mpegurl|octet-stream/i.test(result.type))throw new AppError(422,'媒体格式不符合要求',{[field]:'请提供可直接播放的视频文件或受支持媒体源'});
 if(field!=='play_url'&&!/^image\/(jpeg|png|webp|gif|avif)/i.test(result.type))throw new AppError(422,'图片格式不符合要求',{[field]:'需要 PNG、JPEG、WebP、GIF 或 AVIF 图片'});
 return result;
}
export async function checkContent(d){await checkMedia(d.cover_url,'cover_url');if(d.type==='video')await checkMedia(d.play_url);else{const urls=d.chapters.flatMap(c=>c.pages);for(let i=0;i<urls.length;i+=4)await Promise.all(urls.slice(i,i+4).map(u=>checkMedia(u,'chapters')));}}
