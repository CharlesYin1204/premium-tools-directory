import {Picture,EntryLink} from './public-client';
import {adTemplate,adImage} from '../lib/ad-slots';
import Icon from './icons';
export default function AdCreative({ad,entry,data,device='pc',contentId,preview=false}){
 if(!entry)return null;
 const banner=adTemplate(ad)==='banner',label=ad.is_demo?'演示广告':ad.ad_type==='external'?'广告':'推广';
 const children=banner?<><Picture style={{objectFit:ad.image_fit||'cover'}} src={adImage(ad,device)} alt={ad.title||entry.name}/><span className="ad-disclosure">{label}</span>{preview&&ad.image_fit==='cover'&&<span className="ad-crop-guide" aria-hidden="true"/>}{(ad.title||ad.cta)&&<span className="ad-caption"><strong>{ad.title||entry.name}</strong>{ad.description&&<small>{ad.description}</small>}<span>{ad.cta||(entry.action_mode==='download'?'前往下载':'了解更多')} ↗</span></span>}</>:<><div className="entry-top"><Picture style={{objectFit:ad.image_fit||'cover'}} src={adImage(ad,device)||entry.icon_url} alt="" className="entry-icon"/><span className="entry-name"><strong>{ad.title||entry.name}</strong><small>{label}</small></span><Icon name="external" size={18}/></div><p>{ad.description||entry.description}</p><div className="card-bottom"><span>{entry.tags?.[0]}</span><span>{ad.cta||(entry.action_mode==='download'?'前往下载':'访问网站')} ↗</span></div></>;
 const className=banner?'ad-banner ad-slot-'+ad.location:'entry-card is-featured';
 return preview?<div className={className}>{children}</div>:<EntryLink entry={entry} placement={ad} contentId={contentId} className={className}>{children}</EntryLink>;
}
