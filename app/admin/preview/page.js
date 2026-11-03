import {redirect} from 'next/navigation';
import {user} from '../../../lib/security';
import {adminLoginUrl} from '../../../lib/admin-return';
import Preview from '../../../components/preview';
export const dynamic='force-dynamic';
export const metadata={title:'发布预览',robots:{index:false,follow:false}};
export default async function Page({searchParams}){if(!await user())redirect(adminLoginUrl('/admin/preview',await searchParams));return <Preview/>;}
