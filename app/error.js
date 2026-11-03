'use client';
export default function Error({reset}){return <main className="error-page"><h1>连接暂时遇到问题</h1><p>数据暂时无法加载。你的操作没有丢失，请稍后重试。</p><button className="button primary" onClick={reset}>重新加载</button></main>;}
