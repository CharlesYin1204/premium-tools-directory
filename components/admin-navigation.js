'use client';
import {useEffect,useState} from 'react';
import {navigationForRole,activeAdminLeaf} from '../lib/admin-navigation';
import {useAdminAnchor} from './admin-anchor';
import Icon from './icons';
export default function AdminNavigation({role,section,params,collapsed,onExpand,onNavigate}){
 const hash=useAdminAnchor(),active=activeAdminLeaf(section,params,hash),nodes=navigationForRole(role),[open,setOpen]=useState({});
 const contains=node=>node.id===active||node.children?.some(contains);
 useEffect(()=>{const ancestors={};function visit(items){items.forEach(item=>{if(item.children){if(contains(item))ancestors[item.id]=true;visit(item.children);}});}visit(nodes);setOpen(current=>({...current,...ancestors}));},[active]);
 function render(items,depth=0){return <ul className={'admin-menu-level level-'+depth}>{items.map(node=><li key={node.id}>{node.children?<><button type="button" className={'admin-menu-parent'+(contains(node)?' current-branch':'')} aria-label={node.label} title={node.label} aria-expanded={!collapsed&&!!open[node.id]} aria-controls={'admin-children-'+node.id} onClick={()=>{if(collapsed){onExpand();setOpen(current=>({...current,[node.id]:true}));}else setOpen(current=>({...current,[node.id]:!current[node.id]}));}}>{node.icon&&<Icon name={node.icon} size={19}/>}<span className="admin-menu-label">{node.label}</span><span className="admin-menu-chevron"><Icon name={open[node.id]?'left':'right'} size={14}/></span></button><div id={'admin-children-'+node.id} hidden={collapsed||!open[node.id]}>{render(node.children,depth+1)}</div></>:<a href={node.href} title={node.label} aria-label={node.label} aria-current={active===node.id?'page':undefined} className={active===node.id?'active':''} onClick={onNavigate}>{node.icon&&<Icon name={node.icon} size={19}/>}<span className="admin-menu-label">{node.label}</span></a>}</li>)}</ul>;}
 return <nav className="admin-tree-navigation" aria-label="后台功能导航">{render(nodes)}</nav>;
}
