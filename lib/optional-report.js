import {randomUUID} from 'node:crypto';
export async function optionalReport(read){
 try{return {stats:await read(),stats_status:'ok'};}
 catch(error){if(error.status&&error.status<500)throw error;const request_id=randomUUID();console.error('Report source unavailable',request_id);return {stats:null,stats_status:'unavailable',stats_error:{message:'统计暂时无法读取，请重试。',request_id}};}
}
