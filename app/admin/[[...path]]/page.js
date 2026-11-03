import {publishedSiteMetadata} from '../../../lib/site-metadata';
import {adminMenuDefaults} from '../../../lib/site-config';
import {can,sectionAction} from '../../../lib/permissions';
import {redirect,notFound,forbidden} from 'next/navigation';
import {user} from '../../../lib/security';
import {adminLoginUrl} from '../../../lib/admin-return';
import Admin from '../../../components/admin';
export const dynamic='force-dynamic';
export async function generateMetadata({params}){const {path=[]}=await params;const section=path[0]||'dashboard',site=await publishedSiteMetadata();return {title:(section==='video-library'?'视频库':section==='video-management'?'视频管理':section==='comic-management'?'漫画管理':section==='apps'?'APP 下载':section==='entries'?'网址管理':section==='placements'?'广告管理':section==='companies'?'渠道管理':site.admin_menu_labels[section])||adminMenuDefaults.find(([key])=>key===section)?.[1]||(section==='password'?'修改密码':'运营工作台'),robots:{index:false,follow:false}};}
export default async function Page({params,searchParams}){const {path=[]}=await params;const u=await user();if(!u)redirect(adminLoginUrl('/admin'+(path.length?'/'+path.join('/'):''),await searchParams));const section=path[0]||'entries';if(!path.length||section==='dashboard')redirect('/admin/entries');if(section==='sync')redirect('/admin/video-library');if(!['dashboard','companies','categories','entries','apps','video-library','video-management','comic-management','contents','placements','settings','sync','ai','reports','audit','users','password'].includes(section))notFound();if(!can(u.role,sectionAction(section)))forbidden();return <Admin section={section} initialUser={u}/>;}
