'use client';
import {useEffect,useRef} from 'react';
export default function ConfirmDialog({busy,onDismiss,children}){
 const ref=useRef(null);
 useEffect(()=>{
  const dialog=ref.current,previous=document.activeElement,overflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';
  return ()=>{dialog.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[]);
 return <dialog ref={ref} className="confirm-dialog native-confirm" aria-labelledby="confirm-title" aria-describedby="confirm-description" aria-busy={busy} onKeyDown={e=>{if(e.key!=='Tab')return;const buttons=[...ref.current.querySelectorAll('button:not(:disabled)')];const first=buttons[0],last=buttons.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}} onCancel={e=>{e.preventDefault();if(!busy)onDismiss();}}>{children}</dialog>;
}
