import Link from 'next/link';
import {videoDetailConfig} from '../lib/video-detail-config';
import {Video,Picture,RecommendationLink} from './public-client';
import {EntryCard,Heading,Promotions} from './home-modules';
import {publishedDate} from '../lib/public-content';
import {recommendContents} from '../lib/recommendations';
import Icon from './icons';
import VideoActions from './video-actions';

export default function VideoDetail({content,data,preview=false,recommendationAt,recommendationTokens={}}){
 const updated=publishedDate(content.published_at);
 const categories=data.categories.filter(category=>content.category_ids?.includes(category.id));
 const company=data.companies.find(item=>item.id===content.company_id);
 const config=videoDetailConfig(data.site);
 const related=recommendContents(content,data.contents,config,recommendationAt).items.map(r=>r.item);
 const entries=data.entries.filter(entry=>content.entry_ids?.includes(entry.id));
 return <>
  <nav className="breadcrumb" aria-label="当前位置"><Link href="/">发现</Link><Icon name="right" size={14}/><Link href="/videos">精选视频</Link><Icon name="right" size={14}/><span aria-current="page">{content.title}</span></nav>
  <div className={'watch-layout'+(related.length?'':' without-related')}>
   <article className="watch-main">
    <section className="watch-stage" aria-label="视频播放">
     <div className="watch-stage-label"><span><Icon name="play" size={16}/>正在播放</span><span>{content.brand||'站内精选'}</span></div>
     <Video key={content.id} content={content} preview={preview} seconds={data.site.video_seconds}/>
    </section>
   </article>
   {related.length>0&&<aside className="watch-related" aria-labelledby="watch-related-title"><div className="watch-related-heading"><h2 id="watch-related-title">{config.title}</h2><Link href="/videos">全部视频<Icon name="right" size={14}/></Link></div>{config.note&&<p>{config.note}</p>}<div className="watch-related-list">{related.map(item=><RecommendationLink className="watch-related-card" key={item.id} item={item} token={preview?null:recommendationTokens[item.id]}><div className="watch-related-cover"><Picture src={item.cover_url} alt=""/><span><Icon name="play" size={15}/></span></div><div><h3>{item.title}</h3>{publishedDate(item.published_at)&&<small>{publishedDate(item.published_at).label}</small>}</div></RecommendationLink>)}</div></aside>}
  </div>
  <section className="watch-information" id="content-details" tabIndex={-1} aria-labelledby="watch-title">
   <div className="watch-title-row"><div><span>影片资料</span><h1 id="watch-title">{content.title}</h1></div>{content.is_demo&&<span className="watch-demo">演示内容</span>}</div>
   <dl className="watch-facts">
    <div><dt>片名</dt><dd>{content.title}</dd></div>
    <div><dt>品牌</dt><dd>{content.brand||company?.name||'站内精选'}</dd></div>
    <div><dt>所属分类</dt><dd>{categories.map(item=>item.name).join('、')||'未分类'}</dd></div>
    <div><dt>更新日期</dt><dd>{updated?<time dateTime={updated.iso}>{updated.label}</time>:'—'}</dd></div>
    <div><dt>内容来源</dt><dd>{content.source_system||'运营精选'}</dd></div>
    <div><dt>内容编号</dt><dd>{content.source_id||content.slug}</dd></div>
    <div className="watch-summary"><dt>简介</dt><dd>{content.summary||'暂无内容简介。'}</dd></div>
   </dl>
   <div className="watch-information-footer">
    {(categories.length>0||content.tags?.length>0)&&<div className="watch-topics" aria-label="分类与标签">{categories.map(category=><Link key={category.id} href={'/videos?'+new URLSearchParams({category:category.id})}>{category.name}<Icon name="right" size={12}/></Link>)}{content.tags?.map(tag=><Link key={tag} href={'/videos?'+new URLSearchParams({tag})}>#{tag}</Link>)}</div>}
    {!preview&&<VideoActions title={content.title}/>} 
   </div>
   <p className="watch-rights">{content.rights_note||'内容经授权展示'}</p>
  </section>
  {entries.length>0&&<section className="section"><Heading title="探索相关产品"/><div className="entry-grid">{entries.map(entry=><EntryCard key={entry.id} entry={entry} data={data} contentId={content.id}/>)}</div></section>}
  <Promotions data={data} location="detail" contentId={content.id}/>
 </>;
}
