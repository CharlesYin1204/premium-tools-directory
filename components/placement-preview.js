import {locations} from '../lib/catalog';
import AdCreative from './ad-creative';
import {targetSelection} from '../lib/entry-platform';
import Icon from './icons';

export default function PlacementPreview({resource:r,mobile}){
 const c=r.preview_context,e=c?.entry,device=mobile?'h5':'pc',visible=r.device==='all'||r.device===device;
 return <section className="placement-preview">
  <div className="placement-preview-heading"><span className="eyebrow">推广展示预览</span><h1>{locations[r.location]?.label||'未配置位置'}</h1><p>{c?.category||c?.content||(r.location==='landing'?'网站中间落地页 · 访问按钮下方':'首页推荐区域')} · {mobile?'移动 H5':'桌面 PC'}</p></div>
  <p className="placement-preview-note" role="status">排期检查时间：{c?.checked_at?new Date(c.checked_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未检查'}（上海时间）。{c?.warnings.length===0?'当前草稿在此时未发现基础排期或关联资源问题；不代表已发布或通过完整素材校验。':'请检查下方提示；素材仍保留供核对样式。'}</p>
  <dl className="placement-preview-meta"><div><dt>展示设备</dt><dd>{{all:'全部设备',pc:'仅桌面 PC',h5:'仅移动 H5'}[r.device]||'未配置'}</dd></div><div><dt>有效期 · 上海时间</dt><dd>{r.start_at?.replace('T',' ')||'不限开始'} — {r.end_at?.replace('T',' ')||'不限结束'}</dd></div></dl>
  {c?.warnings.length>0&&<div className="placement-preview-warning" role="status">{c.warnings.map(w=><p key={w}>{w}</p>)}</div>}
  {!visible?<div className="empty"><Icon name="monitor" size={30}/><h2>此设备不展示该推广</h2><p>切换预览设备可查看对应展示内容。</p></div>:!e?<div className="empty"><h2>暂无可预览的关联产品</h2><p>请先发布关联产品及其公司、分类。</p></div>:<div className="placement-preview-canvas public-site"><AdCreative ad={r} entry={e} device={device} preview/></div>}
  {e&&<dl className="placement-preview-meta">{[['android','Android'],['ios','iOS / iPad'],['desktop','桌面端']].map(([platform,label])=>{const target=targetSelection(e,platform);return <div key={platform}><dt>{label} · {target.target_platform==='web'?'落地页':'平台地址'}</dt><dd style={{overflowWrap:'anywhere'}}>{target.url||'未配置'}</dd></div>;})}</dl>}<p className="placement-preview-note">素材按{r.image_fit==='contain'?'完整展示，可能留边':'居中裁切'}呈现。裁切模式虚线为建议安全区，请核查标题、标识与按钮未被裁掉；尺寸/解码/大小校验在发布时执行。展示关联产品的当前发布版本。此处仅预览样式，点击不会跳转；排期冲突检查覆盖整个配置时段，与上方所选检查时刻独立。实际投放仍需发布，并再次通过有效期、关联资源与推广容量校验。</p>
 </section>;
}
