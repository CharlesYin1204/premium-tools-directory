import {homeModules} from '../lib/home-modules';
import {HomeExtras} from './portal-home';
import ReturnHome from './return-home';
import {visibleReturnHome} from '../lib/return-home';
import {Promotions} from './home-modules';
export default function HomeIntro({data}){
 const {site}=data,notice=homeModules(site.home_modules).find(m=>m.id==='notice'&&m.enabled),home=visibleReturnHome(site.return_home);
 const hasNotice=notice&&site.portal?.announcements?.some(x=>x.enabled);
 return <><div className={'home-utility-row'+(home&&hasNotice?' has-both':'')}>
 {home&&<ReturnHome config={site.return_home}/>}
 {notice&&<div data-home-module="notice" className="home-top-notice"><HomeExtras data={data} config={notice}/></div>}
 </div><Promotions data={data} location="mobile_search_below"/></>;
}
