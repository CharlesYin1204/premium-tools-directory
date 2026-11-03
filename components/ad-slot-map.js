import {adSlots} from '../lib/ad-slots';
export default function AdSlotMap({location,device,homeOrder=[]}){
 let blocks;
 if(location==='landing')blocks=[{label:'网站名称 / 简介 / 分类'},{label:'访问网站按钮'},{label:adSlots[location].label,selected:true}];
 else if(location==='home'){
  const order=homeOrder.filter(m=>!['notice','friends'].includes(m.id)),index=order.findIndex(m=>m.id==='promotions');
  blocks=[{label:'首页内容区'},...(index>0?[{label:order[index-1].title}]:[]),{label:index<0?'精选入口模块已关闭':order[index].title,selected:true,disabled:index<0},...(index>=0&&order[index+1]?[{label:order[index+1].title}]:[])];
 }else if(location==='home_banner')blocks=[{label:'置顶公告 / 搜索 / 分类导航'},{label:adSlots[location].label,selected:true},{label:'轮播 / 资讯 / 后续首页模块（按配置顺序）'}];
 else if(location==='mobile_search_below')blocks=[{label:'首页标题 / 搜索框'},{label:adSlots[location].label,selected:true,disabled:device==='pc'},{label:'首屏分类导航'}];
 else if(location==='category')blocks=[{label:'分类标题 / 分类导航'},{label:adSlots[location].label,selected:true},{label:'标签筛选 / 入口列表'}];
 else blocks=[{label:'作品标题 / 播放或阅读'},{label:'作品信息 / 相关入口'},{label:adSlots[location]?.label,selected:true}];
 return <span className={'ad-position-map '+(device==='h5'?'is-mobile':'')} aria-hidden="true"><span className="ad-position-browser"><i/><i/><i/></span>{blocks.map((block,i)=><span key={i} className={'ad-position-block'+(block.selected?' highlighted':'')+(block.disabled?' disabled':'')}>{block.label}{block.disabled&&location==='mobile_search_below'?' · PC不展示':''}</span>)}<span className="ad-position-caption">结构示意 · 非页面截图</span></span>;
}
