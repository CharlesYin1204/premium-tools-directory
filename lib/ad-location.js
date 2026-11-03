export const adLocationDescriptions={
 home_banner:'首页主内容区：防失联提示、站点公告下方，首页内容模块之前。多条横幅在此轮播。',
 mobile_search_below:'仅手机首页：顶部搜索与菜单之后、防失联提示和站点公告之后的移动推广横幅。电脑端不展示。',
 home:'首页主内容区的精选入口推广模块。具体先后顺序跟随后台“首页与模块”配置。',
 landing:'站点中间落地页：站点介绍与访问按钮下方。关闭中间落地页时此位置不展示。',
 category:'具体分类页面：分类导航下方，标签筛选与站点列表上方。',
 detail:'视频或漫画详情页：作品播放/阅读区和作品资料之后的推广区域。'
};
export function adLocationPages(overview,location,scope=''){
 const slot=overview?.slots.find(s=>s.id===location),ids=new Set((slot?.pages||[]).map(p=>p.page_id));return (overview?.pages||[]).filter(p=>ids.has(p.id)&&(!scope||p.id===scope)&&p.href);
}
export function adScope(ad){return ad.location==='category'&&ad.category_id?'category:'+ad.category_id:ad.location==='detail'&&ad.content_id?'detail:'+ad.content_id:'';}
export function adLocationHref(page,location,device){return page?.href?page.href+'#ad-position-'+location+'-'+device:null;}
