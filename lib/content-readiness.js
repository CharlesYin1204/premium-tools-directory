const filled=value=>typeof value==='string'&&value.trim().length>0;
export function contentMissing(content,resources=[]){
 const issues=[];
 for(const [key,label] of [['title','标题'],['source_system','来源系统'],['source_id','来源编号'],['cover_url','封面'],['brand','品牌归属'],['rights_note','授权依据']])if(!(key==='brand'&&content.type==='video')&&!filled(content[key]))issues.push(label);
 if(content.type!=='video'&&!resources.some(r=>r.kind==='companies'&&r.id===content.company_id))issues.push('有效渠道');
 if(!Array.isArray(content.category_ids)||!content.category_ids.length||content.category_ids.some(id=>!resources.some(r=>r.kind==='categories'&&r.id===id)))issues.push('有效分类');
 if(content.rights_status!=='approved'||content.revoked)issues.push(content.rights_status==='revoked'||content.revoked?'授权已撤回':'授权确认');
 if(content.type==='video'){if(!filled(content.play_url))issues.push('视频地址');}
 else if(content.type==='comic'){
  if(!Array.isArray(content.chapters)||!content.chapters.length)issues.push('漫画章节');
  else if(content.chapters.some(c=>!filled(c?.title)||!Array.isArray(c?.pages)||!c.pages.length||c.pages.some(p=>!filled(p))))issues.push('章节标题或页面');
 }else issues.push('内容类型');
 return issues;
}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===value;}
export function updatedRangeError(start,end){if(start&&!validDate(start)||end&&!validDate(end))return '更新时间筛选日期无效，请重新选择。';if(start&&end&&start>end)return '更新开始日期不能晚于结束日期。';return '';}
export function updatedInRange(value,start,end){
 if(!start&&!end)return true;
 if(updatedRangeError(start,end)||!value)return false;
 const raw=String(value).replace(' ','T');const date=new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(raw)?raw:raw+'Z');
 if(Number.isNaN(+date))return false;
 const day=new Date(+date+8*3600000).toISOString().slice(0,10);
 return (!start||day>=start)&&(!end||day<=end);
}

export function updatedDisplay(value){
 if(!value)return '—';
 const raw=String(value).replace(' ','T');const date=new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(raw)?raw:raw+'Z');
 return Number.isNaN(+date)?'—':new Date(+date+8*3600000).toISOString().slice(0,16).replace('T',' ');
}
