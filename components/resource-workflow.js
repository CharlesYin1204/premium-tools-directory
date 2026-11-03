'use client';
import AdHistory,{AdSnapshotDiff} from './ad-history';
import {syncedContent} from '../lib/synced-content';
import Icon from './icons';
import {updatedDisplay} from '../lib/content-readiness';
import {statuses} from '../lib/catalog';
const effects={companies:'渠道发布后可供站点入口和内容归属；下架会隐藏其关联入口与内容。',categories:'分类发布后可供访客浏览；下级分类需先发布全部上级。',entries:'发布后展示站点入口，访客点击跳转到已配置的网址。',contents:'候选内容需补齐分类、媒体及授权资料；发布校验通过后才进入前台视频或漫画列表。',placements:'发布后按位置、设备和排期展示已有站点入口；到期或下架后自动停止展示。',settings:'保存全部设置分组为草稿；发布后统一更新前台配置。'};
export default function ResourceWorkflow({section,item,dirty,busy,canWrite,canPublish,revisions,onPreview,onSubmit,onConfirm}){
 const managed=section==='contents'&&syncedContent(item);
 const exists=!!item.id,canRelease=canPublish&&exists&&!item.manual_excluded&&item.status!=='published';
 const canReview=canWrite&&!canPublish&&exists&&!['pending','published'].includes(item.status);
 const locked=dirty||busy;
 return <>
  {section==='placements'?<div className="resource-workflow"><div className="form-actions">{canWrite&&<button className="button" type="submit" value="draft" disabled={busy}>保存草稿</button>}{canWrite&&canPublish&&<button className="button primary" type="submit" value="publish" disabled={busy}>{busy?'正在处理…':item.has_published?'保存并更新投放':'保存并投放'}</button>}{exists&&<button className="button" type="button" disabled={locked} onClick={onPreview}>预览已保存广告</button>}{canReview&&<button className="button" type="button" disabled={locked} onClick={onSubmit}>提交审核</button>}</div><p className="muted">{canPublish?'保存并投放后按所选位置展示；投放校验失败会保留草稿。':'保存草稿后提交管理员审核。'}</p></div>:<div className="resource-workflow"><div className="workflow-summary"><strong>{item.manual_excluded?'已人工排除':dirty?'有未保存的修改':exists?(statuses[item.status]||'草稿'):'尚未保存'}</strong><p>{managed?'原标题、简介、媒体、章节和标签由上游维护；仅处理本地授权与关联异常。人工排除后不会随同步恢复。':effects[section]}</p><small>{exists?`草稿版本 ${item.version} · ${item.has_published?'已有线上版本':'尚未上线'}`:'先保存记录，再预览和发布。'}</small></div>
  <div className="form-actions">{canWrite&&<button className="button primary" disabled={busy||exists&&!dirty} type="submit"><Icon name="check" size={16}/>{busy?'正在处理…':section==='settings'?'保存全部设置':'保存草稿'}</button>}
  {exists&&<button className="button" type="button" disabled={locked} onClick={onPreview}><Icon name="eye" size={16}/>预览已保存草稿</button>}
  {canReview&&<button className="button" type="button" disabled={locked} onClick={onSubmit}>提交审核</button>}
  {canRelease&&<button className="button dark" type="button" disabled={locked} onClick={()=>onConfirm({item,action:'publish',title:item.has_published?'发布本次更新？':'确认首次发布？',text:effects[section]+'系统将校验关联状态和必要资料。'})}>{item.has_published?'发布更新':'首次发布'}</button>}
  {canPublish&&item.has_published&&section!=='settings'&&<button className="button" type="button" disabled={locked} onClick={()=>onConfirm({item,action:'offline',title:'下架此资源？',text:effects[section]+'历史数据保留，可重新编辑发布。'})}>下架</button>}
  {managed&&canPublish&&exists&&<button className="button" type="button" disabled={locked} onClick={()=>onConfirm({item,action:item.manual_excluded?'include':'exclude',title:item.manual_excluded?'恢复为待审核候选？':'人工排除此内容？',text:item.manual_excluded?'仅解除人工排除，不直接上线；来源和授权仍需重新校验。':'立即从前台撤下，后续同步保持排除。来源与历史记录保留。'})}>{item.manual_excluded?'恢复候选':'人工排除'}</button>}
  {dirty&&<span className="muted">请先保存，再执行预览或发布。</span>}
  </div></div>}
  {exists&&<details className="revision-list workflow-history"><summary>发布记录（{revisions.length}）</summary>{!revisions.length?<p>尚未发布，没有可恢复的线上版本。</p>:revisions.map((r,index)=><div key={r.id}><span>发布版本 {r.version} · {r.actor} · {updatedDisplay(r.created_at)}{index===0?' · 最近发布':''}</span>{section==='placements'&&<details className="ad-revision-diff"><summary>对比相邻发布快照</summary>{revisions[index+1]?<AdSnapshotDiff before={revisions[index+1].ad_snapshot} after={r.ad_snapshot} known={!!revisions[index+1].ad_snapshot&&!!r.ad_snapshot}/>:<p>没有更早发布快照可比较；不推定首次上线前状态。</p>}</details>}{canPublish&&!managed&&<button type="button" className="text-button" disabled={locked||item.status==='published'&&r.version===item.version} onClick={()=>onConfirm({item,action:'rollback',more:{revision_id:r.id},title:'恢复此发布版本？',text:'将此历史版本重新发布，并替换当前草稿。系统仍校验关联状态和内容授权，恢复操作会留下新的发布记录。'})}>恢复并发布</button>}</div>)}</details>}
  {exists&&section==='placements'&&canPublish&&<AdHistory locked={locked} key={item.id+':'+item.version} id={item.id} version={item.version}/>}
 </>;
}
