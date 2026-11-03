import Link from 'next/link';
import Icon from '../components/icons';
export default function Forbidden(){return <main className="error-page"><span className="eyebrow">403 · 访问受限</span><Icon name="shield" size={44}/><h1>当前账号无权访问此页面</h1><p>你可以返回工作概览，或联系管理员确认账号权限。</p><Link className="button primary" href="/admin">返回工作概览</Link></main>;}
