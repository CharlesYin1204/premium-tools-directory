// Device hints select only an already approved target, never a client-supplied URL.
export function entryPlatform(userAgent='',ipadHint=false){
 if(/android/i.test(userAgent))return 'android';
 if(/iphone|ipad|ipod/i.test(userAgent)||ipadHint&&/macintosh/i.test(userAgent))return 'ios';
 if(/windows|macintosh|x11|cros|linux/i.test(userAgent)&&!/mobile/i.test(userAgent))return 'desktop';
 return 'unknown';
}
export function targetSelection(entry,platform='unknown',backup=false){
 const action_mode=entry.action_mode==='download'?'download':'visit';
 if(backup)return {url:entry.backup_url,action_mode,os:platform,target_platform:'web',fallback_reason:'user_selected_backup'};
 if(action_mode==='download'){
  const url=platform==='android'?entry.android_url:platform==='ios'?entry.ios_url:null;
  if(url)return {url,action_mode,os:platform,target_platform:platform,fallback_reason:null};
  return {url:entry.target_url,action_mode,os:platform,target_platform:'web',fallback_reason:['android','ios'].includes(platform)?'missing_platform_target':platform==='desktop'?'desktop_landing':'unknown_platform'};
 }
 return {url:entry.target_url,action_mode,os:platform,target_platform:'web',fallback_reason:null};
}
