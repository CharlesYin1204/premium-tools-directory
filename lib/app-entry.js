export const appPlatforms=['windows','macos','linux','android','ios','web'];
export function entryKind(entry){if(['website','app'].includes(entry.entry_kind))return entry.entry_kind;return entry.action_mode==='download'||['download','store'].includes(entry.target_type)?'app':'website';}
export function appMetadataError(meta){
 if(meta==null||meta==='')return null;
 if(typeof meta!=='object'||Array.isArray(meta))return 'APP 资料格式不正确';
 if(meta.platforms!==undefined&&(!Array.isArray(meta.platforms)||meta.platforms.some(p=>!appPlatforms.includes(p))||new Set(meta.platforms).size!==meta.platforms.length))return '请选择有效且不重复的平台';
 for(const [key,max] of [['official_url',1000],['languages',200],['description',10000]])if(meta[key]!==undefined&&(typeof meta[key]!=='string'||meta[key].length>max))return 'APP 资料字段格式或长度不正确';
 if(meta.screenshots!==undefined&&(!Array.isArray(meta.screenshots)||meta.screenshots.length>10||meta.screenshots.some(s=>typeof s!=='string'||s.length>1000)))return '应用截图最多 10 张';
 if(meta.versions!==undefined&&(!Array.isArray(meta.versions)||meta.versions.length>30))return '最多保留 30 个版本';
 const versions=meta.versions||[];
 if(versions.length&&(!Number.isInteger(meta.current_version)||meta.current_version<0||meta.current_version>=versions.length))return '请选择当前发布版本';
 for(const v of versions){
  if(!v||typeof v!=='object'||typeof v.version!=='string'||!v.version.trim()||v.version.length>60)return '每个版本需填写版本号（最多 60 字）';
  for(const [key,max] of [['date',10],['size',40],['notes',4000]])if(v[key]!==undefined&&(typeof v[key]!=='string'||v[key].length>max))return '版本资料格式或长度不正确';
  if(v.date&&!/^\d{4}-\d{2}-\d{2}$/.test(v.date))return '更新日期格式不正确';
  if(!Array.isArray(v.downloads)||!v.downloads.length||v.downloads.length>10)return '每个版本需提供 1–10 个下载地址';
  for(const d of v.downloads)if(!d||!appPlatforms.includes(d.platform)||typeof d.url!=='string'||!d.url.trim()||d.url.length>1000)return '下载平台或地址不完整';
  if(new Set(v.downloads.map(d=>d.platform)).size!==v.downloads.length)return '同一版本的平台不能重复';
 }
 return null;
}
export function appMetadataUrls(meta){if(!meta||typeof meta!=='object')return [];return [meta.official_url,...(meta.screenshots||[]),...(meta.versions||[]).flatMap(v=>v.downloads.map(d=>d.url))].filter(Boolean);}
export function applyAppDownloads(data){const meta=data.app_meta;if(entryKind(data)!=='app'||!meta?.versions?.length)return data;const current=meta.versions[meta.current_version];if(!current)return data;const find=p=>current.downloads.find(d=>d.platform===p)?.url||'';return {...data,action_mode:'download',target_type:'download',target_url:find('web')||find('windows')||find('macos')||find('linux')||current.downloads[0]?.url||data.target_url||'',android_url:find('android'),ios_url:find('ios')};}
