import Link from 'next/link';
import SiteMark from './site-mark';
import Icon from './icons';
import {siteConfig} from '../lib/site-config';
import {portalConfig} from '../lib/portal-config';
import {homeModules} from '../lib/home-modules';
export default function PublicFooter({site,home=false}){
 const config=home&&homeModules(site.home_modules).find(m=>m.id==='friends'&&m.enabled);
 const friends=config?portalConfig(site.portal).friends.filter(x=>x.enabled).slice(0,config.limit):[];
 return <footer className="public-footer compact-footer">
  <div className={'footer-columns'+(friends.length?' has-friends':'')}>
   <div className="footer-introduction"><Link className="footer-brand" href="/"><SiteMark src={site.logo_url} className="footer-site-mark" size={23}/>{site.name}</Link><p>{site.footer}</p></div>
   {friends.length>0&&<section className="footer-friends" data-home-module="friends" aria-label={config.title}><h2>{config.title}</h2><div>{friends.map(n=><a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer">{n.title}<Icon name="external" size={12}/></a>)}</div></section>}
  </div>
  <div className="footer-bottom"><nav aria-label="页脚导航">{siteConfig(site).footer_navigation.filter(i=>i.enabled).map(i=><Link key={i.href} href={i.href}>{i.label}{i.href==='/admin'&&<Icon name="external" size={13}/>}</Link>)}</nav><small>© {new Date().getFullYear()} {site.name}</small></div>
 </footer>;
}
