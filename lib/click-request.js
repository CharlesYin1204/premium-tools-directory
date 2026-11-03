// A redirect response is not by itself evidence of a navigation action.
// Preserve the request method at the reverse proxy as well as checking it here.
export function isClickRequest(req){
 if(req.method!=='GET')return false;
 const q=new URL(req.url).searchParams;
 if(q.has('preview'))return false;
 if(['purpose','sec-purpose'].some(name=>/prefetch|prerender/i.test(req.headers.get(name)||'')))return false;
 return !['next-router-prefetch','x-middleware-prefetch'].some(name=>req.headers.has(name));
}
