import {importTarget} from './import-target.js';
import {createHash} from 'node:crypto';
export function prepareEntryDraft(row,resources,source=null){
 const data={...row},warnings=[];
 const normal=v=>String(v||'').trim().replace(/^[【\[]|[】\]]$/g,'');
 const resolve=(value,kind)=>{const pool=resources.filter(r=>r.kind===kind);const exact=pool.find(r=>r.id===value);if(exact)return exact.id;const matches=pool.filter(r=>normal(r.name)===normal(value));return matches.length===1?matches[0].id:null;};
 for(const key of ['name','target_url'])data[key]=String(data[key]||'').trim();
 data.target_url=importTarget(data.target_url,data.display_domain);
 if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(data.slug||'')){data.slug='import-'+createHash('sha256').update(data.name+'\n'+data.target_url+(!data.target_url&&source?'\n'+source.uploadId+':'+source.rowNumber:'')).digest('hex').slice(0,24);warnings.push('已自动生成唯一标识');}
 if(!data.target_url)warnings.push('目标网址缺失，已存为待补全草稿，不能发布');
 const split=v=>Array.isArray(v)?v:String(v||'').split(/[,，;]/);
 const cats=[...new Set(split(data.category_ids).map(v=>resolve(String(v).trim(),'categories')).filter(Boolean))].slice(0,3);
 if(split(data.category_ids).filter(Boolean).length!==cats.length)warnings.push('已忽略无效、重复或超额分类');
 data.category_ids=cats;const company=resolve(data.company_id,'companies');if(data.company_id&&!company)warnings.push('已忽略不存在的渠道');data.company_id=company||'';
 for(const key of ['tags','aliases'])data[key]=[...new Set(split(data[key]).map(v=>String(v).trim()).filter(Boolean))].slice(0,10);
 if(typeof data.description==='string'&&data.description.length>200){data.description=data.description.slice(0,200);warnings.push('简介已截取前200字');}
 if(!Number.isInteger(Number(data.sort_order))){data.sort_order=0;warnings.push('无效排序已恢复默认');}
 if(!['visit','download'].includes(data.action_mode))data.action_mode='visit';
 if(!['inherit','landing','direct'].includes(data.landing_mode))data.landing_mode='inherit';
 return {data,warnings};
}
export const optionalImportFields=new Set(['icon_url','android_url','ios_url','backup_url']);
