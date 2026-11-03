import {cache} from 'react';
import {query,decode} from './db.js';
// Request-scoped; never read draft branding or retain a stale process cache.
export const publishedSiteMetadata=cache(async()=>{
 const [row]=await query("SELECT published FROM resources WHERE id='site'");
 const site=decode(row?.published)||{};
 return {name:site.name||'导航站',seo_title:site.seo_title,seo_description:site.seo_description,admin_menu_labels:site.admin_menu_labels||{}};
});
