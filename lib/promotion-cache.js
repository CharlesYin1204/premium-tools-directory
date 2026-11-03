export function promotionCacheSeconds(value){const seconds=Number(value);return Number.isInteger(seconds)&&seconds>=0&&seconds<=300?seconds:0;}
export function createPromotionCache(now=Date.now){
 let cached=null,generation=0;
 return {
  invalidate(){cached=null;generation++;},
  async read(load,seconds){
   const started=now(),version=generation;
   try{const rows=await load();if(version!==generation)return {rows:[],state:'hidden'};cached={rows:structuredClone(rows),at:started};return {rows,state:'fresh'};}
   catch{const ttl=promotionCacheSeconds(seconds)*1000;if(cached&&ttl>0&&now()-cached.at<ttl)return {rows:structuredClone(cached.rows),state:'cached'};return {rows:[],state:'hidden'};}
  }
 };
}
