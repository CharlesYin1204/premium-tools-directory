// Write requests are never retried: a lost response does not prove a failed write.
export async function adminApi(path,body,{timeoutMs=body===undefined?15000:45000}={}){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 const writing=body!==undefined;let response;
 try{
  response=await fetch('/api/'+path,{method:writing?'POST':'GET',cache:'no-store',signal:controller.signal,...(writing?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  let result;try{result=await response.json();}catch(e){
   if(controller.signal.aborted)throw e;
   throw Object.assign(Error(writing?'服务器未返回有效结果，请先刷新核对操作状态，避免重复提交。':'服务器响应异常，请稍后重新读取。'),{status:response.status});
  }
  if(!response.ok){const error=Error(result?.message||'服务暂不可用，请稍后重试');error.fields=result?.field_errors;error.status=response.status;error.requestId=result?.request_id;if(error.requestId)error.message+='（问题编号：'+error.requestId+'）';throw error;}
  return result;
 }catch(e){
  if(controller.signal.aborted)throw Error(writing?'操作等待超时，结果尚未确认。请先刷新核对，避免重复提交。':'读取超时，请检查网络后重新读取。');
  if(!response)throw Error(writing?'网络连接中断，操作结果尚未确认。请先刷新核对，避免重复提交。':'网络连接失败，请检查网络后重试。');
  throw e;
 }finally{clearTimeout(timer);}
}
