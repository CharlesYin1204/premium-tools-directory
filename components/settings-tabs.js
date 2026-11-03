'use client';
import {useEffect,useRef,useState} from 'react';
import Icon from './icons';
import {useAdminAnchor,setAdminAnchor} from './admin-anchor';

const groups=[
 {id:'landing',title:'网站落地页',short:'站点跳转与广告',icon:'external',description:'开启后先展示站点详情和落地页广告，由访客点击访问网站；关闭则直接跳转目标。单个站点可以单独覆盖此设置。保存并发布后生效，广告在广告位管理中配置。',keys:['entry_landing_enabled']},
 {id:'portal',title:'公告、资讯与外观',short:'公告 / 资讯 / 友情链接',icon:'grid',description:'分别管理站点公告、资讯、友情链接和前台外观；搜索仅使用站内检索。',keys:['portal']},
 {id:'video',title:'视频页面',short:'播放与相关推荐',icon:'play',description:'设置视频详情推荐区；保存后可在 PC/H5 草稿预览中查看，发布后才对访客生效。',keys:['video_detail']},
 {id:'copy',title:'文案与菜单',short:'前台内容与导航',icon:'file',description:'集中管理前台文案、主菜单和页脚菜单。',keys:['page_copy','navigation','footer_navigation']},
 {id:'support',title:'客服设置',short:'联系渠道与入口',icon:'users',description:'管理客服入口和各联系渠道，桌面端悬停展开，移动端在页脚上方点击展开。',keys:['support_enabled','support_channels']},
 {id:'brand',title:'品牌与联系',short:'站点身份信息',icon:'compass',description:'维护站点名称、Logo、页脚说明和反馈邮箱。',keys:['name','logo_url','footer','contact_email']},
 {id:'home',title:'首页与模块',short:'首屏与内容顺序',icon:'grid',description:'配置首页主视觉，并调整各内容模块的显示、顺序和数量。',keys:['hero_title','hero_subtitle','cover_url','home_modules','return_home']},
 {id:'seo',title:'搜索优化',short:'搜索结果摘要',icon:'search',description:'设置搜索引擎和分享卡片使用的默认标题与描述。',keys:['seo_title','seo_description']},
];

export default function SettingsTabs({fields,renderField,errors}){
 const anchor=useAdminAnchor();
 const [active,setActive]=useState('brand'),[nativeError,setNativeError]=useState('');
 useEffect(()=>{const id=anchor.startsWith('portal-')?'portal':anchor;if(groups.some(g=>g.id===id))setActive(id);},[anchor]);
 const root=useRef(null),invalidFrame=useRef(null);
 // Keep legacy labels in the saved settings object, but no longer expose an editor.
 const editableFields=fields.filter(([key])=>!['admin_menu_labels','privacy','rights_policy','content_release_approved','approval_note','analytics_enabled','video_seconds'].includes(key));
 const sections=groups.map(g=>({...g,fields:editableFields.filter(f=>g.keys.includes(f[0]))}));
 sections.find(g=>g.id==='portal').fields.push(...editableFields.filter(f=>!groups.some(g=>g.keys.includes(f[0]))));
 useEffect(()=>{const group=sections.find(g=>g.fields.some(([key])=>errors[key]));if(group){setActive(group.id);requestAnimationFrame(()=>root.current?.querySelector('#settings-panel-'+group.id+' [aria-invalid="true"]')?.focus());}},[errors]);
 useEffect(()=>{root.current?.querySelector('#settings-tab-'+active)?.scrollIntoView({block:'nearest',inline:'nearest'});},[active]);
 useEffect(()=>()=>cancelAnimationFrame(invalidFrame.current),[]);
 function keyboard(e,index){const next={ArrowDown:(index+1)%groups.length,ArrowRight:(index+1)%groups.length,ArrowUp:(index+groups.length-1)%groups.length,ArrowLeft:(index+groups.length-1)%groups.length,Home:0,End:groups.length-1}[e.key];if(next===undefined)return;e.preventDefault();setActive(groups[next].id);setAdminAnchor(groups[next].id==='portal'?'portal-appearance':groups[next].id);root.current.querySelector('#settings-tab-'+groups[next].id)?.focus();}
 function invalid(e){e.preventDefault();if(invalidFrame.current)return;const target=e.target;setNativeError(target.validationMessage);const panel=target.closest('[role="tabpanel"]');if(panel)setActive(panel.dataset.group);invalidFrame.current=requestAnimationFrame(()=>{invalidFrame.current=null;target.focus();});}
 return <div className="settings-tabs" ref={root} onInvalidCapture={invalid}>
  <aside className="settings-tab-list" role="tablist" aria-label="站点设置分组">{sections.map((g,i)=>{const count=g.fields.filter(([key])=>errors[key]).length;return <button key={g.id} id={'settings-tab-'+g.id} type="button" role="tab" aria-label={g.title} aria-selected={active===g.id} aria-controls={'settings-panel-'+g.id} tabIndex={active===g.id?0:-1} onClick={()=>{setActive(g.id);setAdminAnchor(g.id==='portal'?'portal-appearance':g.id);setNativeError('');}} onKeyDown={e=>keyboard(e,i)}><span className="settings-tab-icon"><Icon name={g.icon} size={18}/></span><span><strong>{g.title}</strong><small>{g.short}</small></span>{count>0&&<span className="settings-error-count" aria-label={count+'项错误'}>{count}</span>}<Icon name="right" size={15}/></button>;})}</aside>
  <div className="settings-workspace">
   {nativeError&&<p className="error-message settings-native-error" role="alert">{nativeError}</p>}
   {sections.map(g=><section key={g.id} role="tabpanel" id={'settings-panel-'+g.id} data-group={g.id} aria-labelledby={'settings-tab-'+g.id} hidden={active!==g.id}><header className="settings-panel-heading"><span className="settings-panel-icon"><Icon name={g.icon} size={20}/></span><div><h3>{g.title}</h3><p>{g.description}</p></div></header><div className="settings-panel-fields form-grid">{g.fields.map(renderField)}</div></section>)}
   <p className="settings-save-note"><Icon name="check" size={15}/>切换分组不会丢失当前填写内容；页面底部的保存、预览和发布对全部设置生效。</p>
  </div>
 </div>;
}
