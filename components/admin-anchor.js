'use client';
import {useEffect,useState} from 'react';
export function useAdminAnchor(){const [anchor,setAnchor]=useState('');useEffect(()=>{const sync=()=>setAnchor(location.hash.slice(1));sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};},[]);return anchor;}
export function setAdminAnchor(anchor){history.pushState(null,'',location.pathname+location.search+'#'+anchor);window.dispatchEvent(new Event('hashchange'));}
