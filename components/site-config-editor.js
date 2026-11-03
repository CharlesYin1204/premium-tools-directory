'use client';
import {useEffect,useState} from 'react';
import {copyFields,adminMenuDefaults,configDefaults,channelTypes} from '../lib/site-config';
import {ImageField} from './media-editor';
import Icon from './icons';

const copyGroups=[
 ['页头与搜索','访客进入站点和发起搜索时看到的文字。',['brand_tagline','header_search','search_placeholder','search_button']],
 ['首页主视觉','首页第一屏的引导文案和行动按钮。',['hero_kicker','hero_caption','explore_label']],
 ['快捷入口','工具、视频和漫画三个快捷入口的标题与说明。',['quick_tools_title','quick_tools_note','quick_video_title','quick_video_note','quick_comic_title','quick_comic_note']],
 ['品牌介绍','首页底部品牌说明和介绍入口。',['brand_note_title','brand_note_text','about_link']],
 ['频道页面','分类、搜索、视频、漫画和关于页面的标题与说明。',['directory_title','directory_note','search_title','videos_title','videos_note','comics_title','comics_note','about_title','about_kicker']],
 ['客服文案','客服浮窗的标题、说明和按钮文字。',['support_title','support_note','support_button']]
];
const adminGroups=[['日常工作',['dashboard','entries','companies','categories','contents','placements']],['运营分析',['sync','ai','reports','audit']],['系统管理',['settings','users']]];
const titles={navigation:'前台主菜单',footer_navigation:'页脚菜单',support_channels:'客服渠道'};

function CopyEditor({current,onChange,disabled,groupAttrs}){const definitions=new Map(copyFields.map(v=>[v[0],v]));return <div {...groupAttrs} className="copy-editor">{copyGroups.map(([title,note,keys])=><section className="config-section" key={title}><header><h4>{title}</h4><p>{note}</p></header><div className="config-fields">{keys.map(key=>{const [,label,fallback,max]=definitions.get(key);const fieldValue=current[key]??fallback;return <label key={key}><span>{label}</span><input disabled={disabled} value={fieldValue} maxLength={max} required onChange={e=>onChange({...current,[key]:e.target.value})}/><small>{String(fieldValue).length} / {max}</small></label>;})}</div></section>)}</div>}

function AdminLabels({current,onChange,disabled,groupAttrs}){const definitions=new Map(adminMenuDefaults);return <div {...groupAttrs} className="admin-label-editor"><div className="config-callout"><Icon name="menu" size={18}/><p>只修改后台侧栏显示名称，不会改变页面地址、权限或功能。</p></div>{adminGroups.map(([title,keys])=><section className="config-section compact" key={title}><header><h4>{title}</h4><p>修改后发布生效</p></header><div className="admin-label-list">{keys.map(key=><label key={key}><span><strong>{definitions.get(key)}</strong><small>{key}</small></span><input disabled={disabled} value={current[key]??definitions.get(key)} maxLength={20} required aria-label={definitions.get(key)+'菜单名称'} onChange={e=>onChange({...current,[key]:e.target.value})}/></label>)}</div></section>)}</div>}

function ListEditor({kind,items,onChange,disabled,onBusy,groupAttrs}){
 const support=kind==='support_channels';const [selected,setSelected]=useState(0);
 useEffect(()=>{if(selected>=items.length)setSelected(Math.max(0,items.length-1));},[items.length,selected]);
 const update=(i,p)=>onChange(items.map((v,j)=>i===j?{...v,...p}:v));
 const move=(i,offset)=>{const list=[...items];[list[i],list[i+offset]]=[list[i+offset],list[i]];onChange(list);setSelected(i+offset);};
 const remove=i=>{onChange(items.filter((_,j)=>i!==j));setSelected(Math.max(0,i-1));};
 const add=()=>{onChange([...items,support?{type:'telegram',label:'',value:'',note:'',qr_url:'',enabled:false}:{label:'',href:'',icon:'external',enabled:true}]);setSelected(items.length);};
 const item=items[selected];
 return <div {...groupAttrs} className="menu-editor"><div className="config-callout"><Icon name={support?'users':'menu'} size={18}/><p>{support?'总开关与渠道开关同时开启才显示；列表顺序就是访客看到的顺序。':'先在左侧选择菜单项，再在右侧修改名称、地址和显示状态。列表顺序就是实际展示顺序。'}</p></div><div className="menu-editor-layout"><section className="menu-structure" aria-label={titles[kind]+'结构'}><header><div><h4>{titles[kind]}结构</h4><span>{items.length} / {support?20:12} 项</span></div><button type="button" className="button" disabled={disabled||items.length>=(support?20:12)} onClick={add}><Icon name="plus" size={15}/>添加</button></header>{items.length?<ol>{items.map((entry,i)=><li key={i} className={selected===i?'selected':''}><button type="button" className="menu-select" aria-pressed={selected===i} onClick={()=>setSelected(i)}><span className="menu-order">{i+1}</span><span className="menu-summary"><strong>{entry.label||'未命名项目'}</strong><small>{support?(channelTypes[entry.type]||'客服渠道'):(entry.href||'尚未填写链接')}</small></span><span className={'config-status '+(entry.enabled?'enabled':'')}>{entry.enabled?'显示':'隐藏'}</span><Icon name="right" size={15}/></button><div className="menu-row-actions"><button type="button" aria-label={(entry.label||titles[kind])+'上移'} disabled={disabled||i===0} onClick={()=>move(i,-1)}>↑</button><button type="button" aria-label={(entry.label||titles[kind])+'下移'} disabled={disabled||i===items.length-1} onClick={()=>move(i,1)}>↓</button></div></li>)}</ol>:<div className="config-empty"><Icon name="inbox" size={22}/><p>还没有{titles[kind]}</p><small>点击“添加”创建第一项</small></div>}</section><section className="menu-item-settings" aria-live="polite">{item?<><header><div><span className="eyebrow">第 {selected+1} 项</span><h4>{item.label||'未命名项目'}</h4></div><label className="switch-control"><input type="checkbox" disabled={disabled} checked={item.enabled} onChange={e=>update(selected,{enabled:e.target.checked})}/><span>显示</span></label></header><fieldset disabled={disabled}><label><span>名称</span><input aria-label={`${support?'客服':'菜单'} ${selected+1} 名称`} required maxLength={support?30:20} value={item.label} onChange={e=>update(selected,{label:e.target.value})}/><small>访客可见，最多 {support?30:20} 字</small></label>{support&&<label><span>渠道类型</span><select value={item.type} onChange={e=>update(selected,{type:e.target.value})}>{Object.entries(channelTypes).map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label>}<label><span>{support?'联系方式':'链接地址'}</span><input aria-label={`${support?'客服':'菜单'} ${selected+1} 地址`} required={!support} maxLength={2048} value={support?item.value:item.href} placeholder={support?'邮箱、电话或完整 HTTPS 链接':'站内 / 开头，外部完整 HTTPS 地址'} onChange={e=>update(selected,{[support?'value':'href']:e.target.value})}/><small>{support?'微信可仅上传二维码；其他社交渠道请填写完整 HTTPS 链接。':'站内页面填写 / 开头路径，外部网站填写完整 HTTPS 地址。'}</small></label>{support&&<label><span>补充说明</span><input maxLength={120} value={item.note} onChange={e=>update(selected,{note:e.target.value})}/></label>}{support&&<div className="menu-qr-field"><span>联系二维码</span><ImageField value={item.qr_url} onChange={v=>update(selected,{qr_url:v})} attrs={{disabled}} purpose="cover" recommendation="建议 600 × 600 px，正方形，二维码四周保留留白" onBusy={onBusy}/></div>}<div className="menu-item-footer"><span>排序可在左侧调整</span><button className="text-button danger" type="button" disabled={disabled} onClick={()=>remove(selected)}>移除此项</button></div></fieldset></>:<div className="config-empty"><Icon name="menu" size={24}/><p>选择或添加一项开始配置</p></div>}</section></div></div>;
}

export default function SiteConfigEditor({kind,value,onChange,disabled,onBusy,groupAttrs}){
 const defaults=configDefaults(),current=value&&typeof value==='object'?value:defaults[kind];
 if(kind==='page_copy')return <CopyEditor current={current} onChange={onChange} disabled={disabled} groupAttrs={groupAttrs}/>;
 if(kind==='admin_menu_labels')return <AdminLabels current={current} onChange={onChange} disabled={disabled} groupAttrs={groupAttrs}/>;
 const items=Array.isArray(current)?current:[];
 return <ListEditor kind={kind} items={items} onChange={onChange} disabled={disabled} onBusy={onBusy} groupAttrs={groupAttrs}/>;
}
