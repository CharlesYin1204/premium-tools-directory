import './globals.css';
import './settings-workspace.css';
import './admin-mobile.css';
import './public-theme.css';
import './portal-theme.css';
import './admin-refinements.css';
import {publishedSiteMetadata} from '../lib/site-metadata';
export const dynamic='force-dynamic';
export async function generateMetadata(){const site=await publishedSiteMetadata();return {title:{default:site.seo_title||site.name,template:`%s · ${site.name}`},description:site.seo_description||undefined};}
export default function Layout({children}){return <html lang="zh-CN"><body>{children}</body></html>;}
