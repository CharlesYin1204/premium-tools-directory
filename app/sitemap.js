import {getPublic} from '../lib/resources';
export const dynamic='force-dynamic';
export default async function sitemap(){const d=await getPublic();return ['','/categories','/videos','/comics',...d.categories.map(x=>'/category/'+x.slug),...d.contents.map(x=>'/'+x.type+'/'+x.slug)].map(p=>({url:process.env.PUBLIC_URL+p,lastModified:new Date()}));}
