// A displayed domain is a fallback only; never use a collection's source page.
export function importTarget(primary,domain=''){
 const value=String(primary||'').trim()||String(domain||'').trim();
 if(value.startsWith('//'))return 'https:'+value;
 if(/^[^\s/:?#]+\.[^\s/:?#]+(?::\d+)?(?:[/?#].*)?$/.test(value))return 'https://'+value;
 return value;
}
