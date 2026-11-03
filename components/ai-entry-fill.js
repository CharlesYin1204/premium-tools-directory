"use client";
import { useEffect, useRef, useState } from "react";
export default function AiEntryFill({ url, disabled, onApply }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [suggestion, setSuggestion] = useState(null),
    controller = useRef(null);
  useEffect(() => {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setSuggestion(null);
    setError("");
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, [url]);
  async function identify() {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setError("");
    setSuggestion(null);
    const timer = setTimeout(() => c.abort(), 65000);
    try {
      const response = await fetch("/api/admin/ai-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: c.signal,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.message);
      if (controller.current === c && !c.signal.aborted) setSuggestion(data);
    } catch (e) {
      if (controller.current === c)
        setError(
          e.name === "AbortError" ? "识别已取消或超时，请重试" : e.message,
        );
    } finally {
      clearTimeout(timer);
      if (controller.current === c) setBusy(false);
    }
  }
  return (
    <section className="ai-entry-fill">
      <strong>AI 识别网站信息</strong>
      <p>
        在下方粘贴目标网址，一键提取名称、简介、标签和别名。仅处理已审核的合规域名；例如
        www.nasa.gov、developer.mozilla.org。生成后可继续人工修改。
      </p>
      <button
        type="button"
        className="button"
        disabled={disabled || busy || !url?.trim()}
        onClick={identify}
      >
        {busy ? "正在读取并识别…" : "AI 一键识别网址"}
      </button>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {suggestion && (
        <div aria-live="polite">
          <h3>{suggestion.fields.name}</h3>
          <p>{suggestion.fields.description}</p>
          <p>
            标签：{suggestion.fields.tags.join("、") || "无"} · 别名：
            {suggestion.fields.aliases.join("、") || "无"}
          </p>
          <small>来源：{suggestion.source}</small>
          <div className="form-actions">
            <button
              type="button"
              className="button primary"
              disabled={disabled}
              onClick={() => {
                onApply(suggestion.fields, false);
                setSuggestion(null);
              }}
            >
              填入空白字段
            </button>
            <button
              type="button"
              className="button"
              disabled={disabled}
              onClick={() => {
                onApply(suggestion.fields, true);
                setSuggestion(null);
              }}
            >
              覆盖上述四项字段
            </button>
          </div>
          <small>只更新编辑表单；仍需保存草稿并审核发布。</small>
        </div>
      )}
    </section>
  );
}
