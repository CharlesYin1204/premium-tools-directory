// Structural slot definitions; campaign data and creative assets are stored in MySQL.
export const adSlots={
 landing:{label:'网站中间落地页',capacity:3,templates:['card','banner'],pc:'卡片图标512 × 512；横幅1200 × 240',h5:'卡片图标512 × 512；横幅750 × 150'},
 home:{label:'首页精选入口',capacity:6,templates:['card'],pc:'512 × 512 图标',h5:'512 × 512 图标'},
 home_banner:{label:'首页横幅轮播',capacity:5,templates:['banner'],pc:'1200 × 240（5:1）',h5:'750 × 150（5:1）'},
 mobile_search_below:{label:'移动搜索下方',capacity:1,templates:['banner'],devices:['h5'],pc:'不展示',h5:'750 × 120（6.25:1）'},
 category:{label:'分类页顶部',capacity:3,templates:['card','banner'],pc:'卡片图标512 × 512；横幅1200 × 200',h5:'卡片图标512 × 512；横幅750 × 150'},
 detail:{label:'内容详情广告',capacity:2,templates:['card','banner'],pc:'卡片图标512 × 512；横幅600 × 400',h5:'卡片图标512 × 512；横幅750 × 150'}
};
export const adTemplate=p=>p.template||'card';
export const adCapacity=p=>adTemplate(p)==='banner'&&p.location!=='home_banner'?1:adSlots[p.location]?.capacity||0;
export const adSlotId=p=>[p.location,p.category_id||'',p.content_id||''].join(':');
export function adImage(p,device){return device==='h5'?p.h5_image_url:p.pc_image_url;}
export function adEligible(p,{device,at=Date.now()}={}){
 if(p.paused||!adSlots[p.location])return false;
 if(p.start_at&&Date.parse(p.start_at+'+08:00')>at||p.end_at&&Date.parse(p.end_at+'+08:00')<=at)return false;
 if(device&&(p.device!=='all'&&p.device!==device||adSlots[p.location].devices&&!adSlots[p.location].devices.includes(device)))return false;
 return !device||adTemplate(p)!=='banner'||!!adImage(p,device);
}
export function adState(p,at=Date.now()){
 if(!p.has_published)return '未发布';
 if(p.published_paused)return '已暂停';
 const live=p.live_schedule||p;
 if(live.end_at&&Date.parse(live.end_at+'+08:00')<=at)return '已到期';
 if(live.start_at&&Date.parse(live.start_at+'+08:00')>at)return '待开始';
 return '投放中';
}

// Recheck live eligibility at click/collection time, including stale open pages.
export function activeAd(data,id,entryId,device,page){
 const p=data.placements.find(p=>p.id===id&&p.entry_id===entryId);
 if(!p||!adEligible(p,{device}))return null;
 const path=typeof page==='string'?page.split(/[?#]/,1)[0]:'';
 if(p.location==='landing'&&!data.entries.some(e=>path==='/site/'+e.slug))return null;
 if(['home','home_banner','mobile_search_below'].includes(p.location)&&path!=='/')return null;
 if(p.location==='category'){
  const category=data.categories.find(c=>path==='/category/'+c.slug);
  if(!category||p.category_id&&p.category_id!==category.id)return null;
 }
 if(p.location==='detail'){
  const content=data.contents.find(c=>path==='/'+c.type+'/'+c.slug);
  if(!content||p.content_id&&p.content_id!==content.id)return null;
 }
 return p;
}
