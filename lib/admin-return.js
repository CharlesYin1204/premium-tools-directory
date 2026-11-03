// Shared by server redirects and the login form; destinations stay within the admin.
export function adminReturn(value){
 if(typeof value!=='string'||/[\\\x00-\x20]/.test(value)||!value.startsWith('/'))return '/admin';
 try{
  const url=new URL(value,'https://admin.invalid');
  if(url.origin!=='https://admin.invalid'||!/^\/admin(?:\/|$)/.test(url.pathname)||/^\/admin\/login\/?$/.test(url.pathname))return '/admin';
  return url.pathname+url.search+url.hash;
 }catch{return '/admin';}
}
export function adminLoginUrl(path,query={}){
 const params=new URLSearchParams();
 for(const [key,value] of Object.entries(query))for(const item of Array.isArray(value)?value:[value])if(item!=null)params.append(key,item);
 return '/admin/login?next='+encodeURIComponent(adminReturn(path+(params.size?'?'+params:'')));
}
