'use client';
import {useState} from 'react';
import Icon from './icons';
export default function SiteMark({src,className='brand-icon',size=25}){
 const [failed,setFailed]=useState(null);
 if(src&&failed!==src)return <span className={className+' custom-site-mark'}><img src={src} alt="" onError={()=>setFailed(src)}/></span>;
 return <span className={className}><Icon name="compass" size={size}/></span>;
}
