import {syncParams} from './laosiji-sync.js';import {AppError} from './security.js';
export function scheduleConfig(input){
 if(!input||typeof input.enabled!=='boolean')throw new AppError(422,'调度开关格式不正确');
 const values={};for(const [key,min,max,label] of [['interval_minutes',1,10080,'间隔分钟'],['lookback_hours',1,8760,'首次回看小时'],['overlap_minutes',0,1440,'增量重叠分钟']]){const n=Number(input[key]);if(!Number.isInteger(n)||n<min||n>max)throw new AppError(422,`${label}须为${min}–${max}整数`);values[key]=n;}
 if(values.overlap_minutes>=values.lookback_hours*60)throw new AppError(422,'重叠时间应小于首次回看范围');
 const note=input.limit_note||'';if(typeof note!=='string'||note.length>500||input.enabled&&!note.trim())throw new AppError(422,'启用前填写真实上游限额核对依据（最多500字）');
 const params=syncParams(input.params||{});delete params.start_time;delete params.end_time;
 return {...values,enabled:input.enabled,limit_note:note.trim(),params};
}
export function scheduleWindow(config,watermark,now=Date.now()){
 const end=new Date(now+8*3600000).toISOString().slice(0,19).replace('T',' ');
 const prior=watermark?Date.parse(watermark.replace(' ','T')+'+08:00'):NaN;
 if(watermark&&!Number.isFinite(prior))throw new AppError(409,'已保存增量水位无效，请排查后重新配置');
 const startMs=Number.isFinite(prior)?prior-config.overlap_minutes*60000:now-config.lookback_hours*3600000;
 if(startMs>now)throw new AppError(409,'增量水位晚于当前时间，请检查服务器时间');
 return {...config.params,start_time:new Date(startMs+8*3600000).toISOString().slice(0,19).replace('T',' '),end_time:end};
}
export function sameScheduleParams(a,b){return ['type','mode','page_size','max_pages','position','keywords','cat_id','task_id'].every(key=>(a?.[key]??null)===(b?.[key]??null));}
