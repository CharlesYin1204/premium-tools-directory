"use client";
import { useEffect, useState } from "react";
export default function AiDirectoryResults({ query }) {
  const [state, setState] = useState({ busy: true }),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    let active = true;
    setState({ busy: true });
    const timer = setTimeout(() => c.abort(), 55000);
    fetch("/api/ai-directory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: query }),
      signal: c.signal,
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw Error(body.message);
        if (active && !c.signal.aborted) setState({ result: body });
      })
      .catch((e) => {
        if (active)
          setState({
            error: e.name === "AbortError" ? "AI 搜索超时，请重试" : e.message,
          });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      c.abort();
    };
  }, [query, attempt]);
  return (
    <div className="ai-directory-results" aria-live="polite">
      {state.busy ? (
        <p role="status">正在理解需求并匹配本站内容…</p>
      ) : state.error ? (
        <>
          <p role="alert" className="error-message">
            {state.error}
          </p>
          <button className="button" onClick={() => setAttempt((n) => n + 1)}>
            重新搜索
          </button>
        </>
      ) : (
        <>
          <p>需求理解：{state.result.intent}</p>
          <p className="muted">仅检索已审核的合规站点，按匹配程度排序。</p>
          {state.result.results.length ? (
            <div className="home-search-grid">
              {state.result.results.map((i) => (
                <a className="home-search-item" href={i.url} key={i.id}>
                  <span>
                    <strong>{i.name}</strong>
                    <small>{i.description}</small>
                    <small>匹配依据：{i.reason}</small>
                    <small>{i.url}</small>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="home-search-empty">
              当前审核范围内没有足够匹配的站点。可以补充用途或内容类型后重试。
            </p>
          )}
        </>
      )}
    </div>
  );
}
