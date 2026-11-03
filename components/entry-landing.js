import Link from 'next/link';
import {Picture,LandingVisit} from './public-client';
import {Promotions} from './home-modules';
import Icon from './icons';
import {visitPath} from '../lib/entry-landing';
import {promotionDisplay} from '../lib/promotion-display';
export default function EntryLanding({entry,data,params}){
 const categories=data.categories.filter(c=>entry.category_ids?.includes(c.id));
 const hasAds=promotionDisplay(data,{location:'landing'}).some(group=>group.items.length);
 let host='站内内容';try{host=new URL(entry.target_url).hostname;}catch{}
 return <>
  <nav className="breadcrumb" aria-label="当前位置"><Link href="/">首页</Link><Icon name="right" size={14}/><Link href="/categories">站点导航</Link><Icon name="right" size={14}/><span>{entry.name}</span></nav>
  <div className={'entry-landing-layout'+(hasAds?' has-ads':'')}>
  <section className="entry-landing-card"><div className="entry-landing-identity"><Picture src={entry.icon_url} alt=""/><div><span className="eyebrow">网站详情</span><h1>{entry.name}</h1><span className="muted">{host}</span></div></div><p className="entry-landing-description">{entry.description||'访问网站了解更多信息。'}</p><div className="entry-landing-actions"><LandingVisit className="button primary" href={visitPath(entry,params)} rel="nofollow">{entry.action_mode==='download'?'前往下载':'访问网站'}<Icon name="external" size={18}/></LandingVisit><Link className="button" href="/categories">继续浏览导航</Link></div>{entry.action_mode==='download'&&<p className="muted">将按当前设备打开对应下载地址。</p>}<div className="entry-landing-topics">{categories.map(c=><Link key={c.id} href={'/category/'+c.slug}>{c.name}</Link>)}{entry.tags?.map(tag=><span key={tag}>#{tag}</span>)}</div></section>
  {hasAds&&<aside className="entry-landing-advertising" aria-label="广告推荐"><Promotions data={data} location="landing" config={{title:"广告推荐"}}/></aside>}
  </div>
 </>;
}
