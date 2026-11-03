export default function ReportAttribution({attribution:a}){
 if(!a)return null;
 return <section className="panel" aria-label="广告点击与曝光关联"><div className="panel-title"><div><h2>广告点击与曝光关联</h2><p>当前筛选范围内共 {a.total} 次广告点击，按服务端曝光记录核对。</p></div></div><div className="reconciliation-grid">{[['已关联曝光',a.matched],['未提供曝光凭据',a.missing],['曝光凭据不匹配',a.unmatched],['旧版关联未知',a.legacy_unknown]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="report-footnote">缺少曝光记录的有效点击仍保留，不补造曝光。广告拦截、网络丢失或在曝光计时完成前点击，均可能造成点击多于曝光；原始点击率不截断。关联只证明事件记录相符，不代表真人注意力或反作弊结果。旧数据不回填。</p></section>;
}
