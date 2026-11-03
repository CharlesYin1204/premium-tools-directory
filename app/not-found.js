import Link from 'next/link';
export default function NotFound(){return <main className="error-page"><span className="eyebrow">404 · LOST IN EXPLORATION</span><h1>这一站，暂时没有找到。</h1><p>页面可能已下架，或地址发生了变化。</p><Link className="button primary" href="/">返回发现首页 →</Link></main>;}
