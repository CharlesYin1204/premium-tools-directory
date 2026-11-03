// New or missing global configuration enables the landing page; explicit overrides win.
export function landingEnabled(site,entry){return entry?.landing_mode==='landing'||entry?.landing_mode!=='direct'&&site?.entry_landing_enabled!==false;}
export function shouldShowLanding(site,entry,params){return landingEnabled(site,entry)&&params.get('visit')!=='1'&&params.get('backup')!=='1';}
export function landingPath(entry,params){const q=new URLSearchParams(params);q.delete('visit');return '/site/'+encodeURIComponent(entry.slug)+(q.size?'?'+q:'');}
export function visitPath(entry,params){const q=new URLSearchParams(params);q.set('visit','1');return '/go/'+encodeURIComponent(entry.id)+'?'+q;}
