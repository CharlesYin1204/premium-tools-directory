'use client';
import {useState} from 'react';
import {adSlots,adState,adTemplate} from '../lib/ad-slots';
import {adPositionPreset} from '../lib/ad-editor-guide';
import {statuses} from '../lib/catalog';
import AdOverview from './ad-overview';
import AdminPagination from './admin-pagination';
import AdLocationDetails from './ad-location-details';
import {adScope} from '../lib/ad-location';
import AdListMaterial from './ad-list-material';
import {AdMetricsSummary,AdMetricsCells} from './ad-list-metrics';

export default function AdWorkspace({items,allItems,resources,context,sp,filters,clearFilters,page,pageSize=20,selected,setSelected,canWrite,canPublish,busy,onEdit,onPreview,onConfirm,metrics,range,onPage}){
 const view=['positions','performance'].includes(sp.get('ad_view'))?sp.get('ad_view'):'list';
 const [moreFilters,setMoreFilters]=useState(false),[batchMode,setBatchMode]=useState(false);
 const rows=items.slice((page-1)*pageSize,page*pageSize);
 const confirmAction=(item,action)=>onConfirm({item,action,title:({pause:'暂停此广告？',resume:'恢复此广告？',publish:'发布此广告？',offline:'下架此广告？',delete:'删除此广告？'})[action],text:action==='delete'?'删除后无法恢复；存在关联时会阻止删除。':'请核对投放范围。系统继续检查排期、素材及目标有效性，历史统计保留。'});
 return <div className="ad-simple-workspace">
  <nav className="ad-workspace-nav" aria-label="广告功能"><button type="button" aria-current={view==='list'?'page':undefined} onClick={()=>filters({ad_view:''})}>广告列表</button><button type="button" aria-current={view==='positions'?'page':undefined} onClick={()=>filters({ad_view:'positions'})}>广告位置</button><button type="button" aria-current={view==='performance'?'page':undefined} onClick={()=>filters({ad_view:'performance'})}>投放效果</button></nav>
  {view==='positions'?<AdOverview sp={sp} canWrite={canWrite} busy={busy} onCreate={location=>onEdit(null,adPositionPreset(location,{device:sp.get('overview_device')||'pc',pageId:sp.get('overview_page')||''}))} items={allItems} overview={context?.overview} active={sp.get('slot')} onSelect={slot=>filters({slot,ad_view:''})} device={sp.get('overview_device')||'pc'} pageId={sp.get('overview_page')||''} onFilter={filters}/>:<>
   {view==='performance'&&<AdMetricsSummary state={metrics.state} range={range} onRange={value=>filters({metric_range:value})} retry={metrics.retry}/>}
   <section className="panel ad-simple-list" aria-label={view==='performance'?'广告效果列表':'广告列表'}>
    <form className="ad-simple-filters" onSubmit={e=>{e.preventDefault();filters({q:new FormData(e.currentTarget).get('q')});}}>
     <input name="q" aria-label="搜索广告" placeholder="搜索广告名称" defaultValue={sp.get('q')||''} key={sp.get('q')||''}/>
     <select aria-label="广告位置筛选" value={sp.get('slot')||''} onChange={e=>filters({slot:e.target.value})}><option value="">全部位置</option>{Object.entries(adSlots).map(([id,slot])=><option key={id} value={id}>{slot.label}</option>)}</select>
     <select aria-label="状态筛选" value={sp.get('status')||''} onChange={e=>filters({status:e.target.value})}><option value="">全部发布状态</option>{Object.entries(statuses).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
     <button className="button" type="submit">搜索</button><button type="button" className="text-button" aria-expanded={moreFilters} onClick={()=>setMoreFilters(v=>!v)}>更多筛选{sp.get('ad_device')||sp.get('ad_type')||sp.get('sort')?' · 已设置':''}</button>
     {['q','slot','status','ad_device','ad_type','sort'].some(k=>sp.get(k))&&<button type="button" className="text-button" onClick={()=>{clearFilters();}}>清除筛选</button>}
     {moreFilters&&<div className="ad-extra-filters"><select aria-label="广告类型筛选" value={sp.get('ad_type')||''} onChange={e=>filters({ad_type:e.target.value})}><option value="">全部广告类型</option><option value="internal">内部推广</option><option value="external">外部合作广告</option></select><select aria-label="广告配置设备范围" value={sp.get('ad_device')||''} onChange={e=>filters({ad_device:e.target.value})}><option value="">全部设备</option><option value="all">PC 与移动端</option><option value="pc">仅 PC</option><option value="h5">仅移动端</option></select><select aria-label="资源排序" value={sp.get('sort')||'order'} onChange={e=>filters({sort:e.target.value})}><option value="order">运营排序</option><option value="updated">最近更新</option><option value="name">名称排序</option></select></div>}
    </form>
    {canWrite&&rows.length>0&&view==='list'&&<button type="button" className="text-button" onClick={()=>{setBatchMode(!batchMode);setSelected([]);}}>{batchMode?'退出批量管理':'批量管理'}</button>}
    {canWrite&&batchMode&&rows.length>0&&view==='list'&&<div className="ad-selection"><label><input type="checkbox" aria-label="全选当前页" checked={rows.every(r=>selected.includes(r.id))} onChange={e=>setSelected(e.target.checked?rows.map(r=>r.id):[])}/>全选当前页</label>{selected.length>0&&<><span>已选 {selected.length} 条</span>{(canPublish?['publish','offline']:['submit']).map(action=><button className="text-button" type="button" key={action} disabled={busy} onClick={()=>onConfirm({batch:true,action,title:'批量'+({publish:'发布',offline:'下架',submit:'提交审核'})[action]+'？',text:'已选择 '+selected.length+' 条广告，每条独立校验并返回结果。'})}>{({publish:'批量发布',offline:'批量下架',submit:'提交审核'})[action]}</button>)}<button className="text-button" onClick={()=>setSelected([])}>取消选择</button></>}</div>}
    {view==='performance'?<div className="table-wrap ad-performance-table"><table><thead><tr><th>广告 / 素材 / 目标</th><th>前台页面与展示位置</th><th>曝光</th><th>点击</th><th>CTR / 报表</th><th>操作</th></tr></thead><tbody>{rows.map(ad=>{const live=ad.has_published&&ad.live_ad?{...ad,...ad.live_ad}:ad;return <tr key={ad.id}><td><strong>{live.name||ad.name}</strong><code title={ad.id}>{ad.slug}</code><span className="badge">{adState(ad)} · {live.device==='all'?'电脑 / 手机':live.device==='h5'?'手机':'电脑'}</span><AdListMaterial ad={live} context={context} resources={resources} snapshotLabel={ad.has_published?'当前线上素材 · 统计包含历史版本':'草稿素材 · 尚未投放'}/></td><td><strong>{adSlots[live.location]?.label}</strong><AdLocationDetails location={live.location} overview={context?.overview} pageId={adScope(live)} device={live.device==='h5'?'h5':'pc'} compact/></td><AdMetricsCells state={metrics.state} id={ad.id} range={range}/><td><button className="button" disabled={busy} onClick={()=>onEdit(ad)}>{canWrite?'编辑广告':'查看广告'}</button><button className="text-button" disabled={busy} onClick={()=>onPreview(ad)}>预览此广告</button></td></tr>;})}</tbody></table></div>:rows.map(ad=><article className="ad-simple-row" key={ad.id}>
     <div className="ad-row-main">{canWrite&&batchMode&&<input type="checkbox" aria-label={'选择'+ad.name} checked={selected.includes(ad.id)} onChange={e=>setSelected(e.target.checked?[...selected,ad.id]:selected.filter(id=>id!==ad.id))}/>}
      <div className="ad-row-name"><strong>{ad.name}</strong><small>{adSlots[ad.location]?.label} · {adTemplate(ad)==='banner'?'横幅':'卡片'} · {ad.device==='all'?'PC / 移动端':ad.device==='h5'?'移动端':'PC'}{ad.is_demo?' · 演示':''}</small></div>
      <div className="ad-row-state"><span className={'badge '+(ad.has_published&&!ad.published_paused?'published':'draft')}>{adState(ad)}</span>{ad.status!=='published'&&<small>{statuses[ad.status]}{ad.has_published?' · 有线上版本':''}</small>}</div>
      <div className="ad-row-actions"><button className="button" disabled={busy} onClick={()=>onEdit(ad)}>{canWrite?'编辑':'查看'}</button><button className="text-button" disabled={busy} onClick={()=>onPreview(ad)}>预览</button>{canPublish&&<button className="text-button" disabled={busy} onClick={()=>confirmAction(ad,ad.has_published?(ad.published_paused?'resume':'pause'):'publish')}>{ad.has_published?(ad.published_paused?'恢复':'暂停'):'发布'}</button>}</div>
     </div>
     <div className="ad-row-details"><div className="ad-row-detail-body"><AdListMaterial ad={ad} context={context} resources={resources}/><div><p>唯一标识：{ad.slug}</p><p>编辑排期：{ad.start_at?.replace('T',' ')||'不限开始'} → {ad.end_at?.replace('T',' ')||'不限结束'}</p><p>最后更新：{ad.updated_at?.slice(0,16)}</p>{canPublish&&ad.has_published&&<button className="text-button danger" disabled={busy} onClick={()=>confirmAction(ad,'offline')}>下架广告</button>}{canWrite&&!ad.has_published&&<button className="text-button danger" disabled={busy} onClick={()=>confirmAction(ad,'delete')}>删除草稿</button>}</div></div></div>
    </article>)}
    {!rows.length&&<div className="empty"><h3>没有符合条件的广告</h3><p>调整筛选，或通过右上角新建广告。</p><button className="button" onClick={clearFilters}>清除筛选</button></div>}
    <AdminPagination total={items.length} page={page} size={pageSize} onPage={onPage} onSize={page_size=>filters({page_size:String(page_size)})} label="每页广告数量"/>
   </section>
  </>}
 </div>;
}
