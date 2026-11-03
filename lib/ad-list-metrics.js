// Report groups are disjoint historical snapshots. Sum counts, never average CTRs.
export function adListMetrics(rows){
 const result=new Map();
 for(const row of rows){if(!row.placement_id)continue;const value=result.get(row.placement_id)||{clicks:0,impressions:0};value.clicks+=Number(row.clicks);value.impressions+=Number(row.impressions);result.set(row.placement_id,value);}
 for(const value of result.values())value.ctr=value.impressions?value.clicks/value.impressions:null;
 return result;
}
