import {AppError} from './security.js';
function setting(env,key,fallback,min,max){const v=env[key];if(v===undefined||v==='')return fallback;const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)throw new AppError(503,'事件时间窗口配置无效');return n;}
export function eventTimePolicy(env=process.env){return {max_delay_hours:setting(env,'EVENT_MAX_DELAY_HOURS',24,1,168),max_future_seconds:setting(env,'EVENT_MAX_FUTURE_SECONDS',300,0,3600),late_seconds:setting(env,'EVENT_LATE_SECONDS',60,1,86400)};}
const sql=n=>new Date(n).toISOString().slice(0,23).replace('T',' ');
export function serverEventTime(received=Date.now(),basis='server_action'){return {occurred_at:sql(received),received_at:sql(received),client_occurred_at:null,time_basis:basis};}
export function clientEventTime(value,received=Date.now(),policy=eventTimePolicy()){
 if(value===undefined)return serverEventTime(received,'server_fallback');
 const invalid=()=>new AppError(422,'事件发生时间无效或超出接收窗口',{occurred_at:'请使用事件发生时的UTC ISO时间，并核对设备时钟'});
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))throw invalid();
 const occurred=Date.parse(value);if(!Number.isFinite(occurred)||new Date(occurred).toISOString()!==value||received-occurred>policy.max_delay_hours*3600000||occurred-received>policy.max_future_seconds*1000)throw invalid();
 return {occurred_at:sql(Math.min(occurred,received)),received_at:sql(received),client_occurred_at:sql(occurred),time_basis:occurred>received?'client_clock_ahead':'client'};
}
