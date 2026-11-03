import {notFound} from 'next/navigation';
import {getPublic} from '../../lib/resources';
// Validate outside this segment's loading boundary so missing URLs keep HTTP 404.
export default async function PublicLayout({children,params}){
 const {slug=[]}=await params;
 const section=slug[0]||'home';
 const detail=['site','category','video','comic'].includes(section);
 if(!['site','home','categories','category','search','ai-search','videos','comics','video','comic','about','privacy','copyright'].includes(section)||(detail?slug.length!==2:slug.length>1))notFound();
 if(detail){const data=await getPublic();const found=section==='site'?data.entries.some(e=>e.slug===slug[1]):section==='category'?data.categories.some(c=>c.slug===slug[1]):data.contents.some(c=>c.slug===slug[1]&&c.type===section);if(!found)notFound();}
 return children;
}
