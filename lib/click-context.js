// Store only a local path: never arbitrary URLs, fragments or search terms.
export function sourcePage(value){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return null;
 const path=value.split(/[?#]/,1)[0];
 return path.length<=200?path:null;
}
