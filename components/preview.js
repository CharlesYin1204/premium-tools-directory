"use client";
import PublicFooter from "./public-footer";
import { portalConfig } from "../lib/portal-config";
import HomeIntro from "./home-intro";
import { useState, useEffect } from "react";
import Icon from "./icons";
import VideoSettingsPreview from "./video-settings-preview";
import { HomeModules } from "./home-modules";
import PlacementPreview from "./placement-preview";
import { copy } from "../lib/site-config";
import SupportWidget from "./support-widget";
import { Nav, Video } from "./public-client";
import SiteMark from "./site-mark";
import Link from "next/link";
import { adminLoginUrl } from "../lib/admin-return";
import { Picture } from "./public-client";
export default function Preview() {
  const [previewTime, setPreviewTime] = useState(""),
    [r, setR] = useState(null),
    [mobile, setMobile] = useState(false),
    [error, setError] = useState(null),
    [attempt, setAttempt] = useState(0),
    [loginUrl, setLoginUrl] = useState("/admin/login");
  useEffect(() => {
    const params = new URLSearchParams(location.search),
      id = params.get("id");
    setPreviewTime(params.get("at") || "");
    setLoginUrl(adminLoginUrl("/admin/preview", Object.fromEntries(params)));
    setR(null);
    setError(null);
    if (!id) {
      setError({
        status: 400,
        message: "缺少预览资源，请从后台资源列表重新打开。",
      });
      return;
    }
    const controller = new AbortController();
    let active = true,
      timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);
    (async () => {
      try {
        const response = await fetch(
          "/api/admin/preview?" +
            new URLSearchParams({
              id,
              ...(params.has("at") ? { at: params.get("at") } : {}),
            }),
          { signal: controller.signal, cache: "no-store" },
        );
        let data;
        try {
          data = await response.json();
        } catch {
          throw {
            status: response.status,
            message: "预览服务返回异常，请稍后重试。",
          };
        }
        if (!response.ok)
          throw {
            status: response.status,
            message: data.message || "暂时无法加载预览。",
          };
        if (active) setR(data);
      } catch (e) {
        if (active)
          setError(
            timedOut
              ? { message: "加载超时，请检查网络后重试。" }
              : e.status
                ? e
                : { message: "网络连接失败，请检查网络后重试。" },
          );
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);
  function applyTime(value) {
    const url = new URL(location.href);
    if (value) url.searchParams.set("at", value);
    else url.searchParams.delete("at");
    history.replaceState(null, "", url);
    setAttempt((n) => n + 1);
  }
  return (
    <>
      <header className="preview-toolbar">
        <h1>
          发布预览 · {r?.name || r?.title || (error ? "暂不可用" : "加载中")}
        </h1>
        <div>
          <button
            className="button"
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
          >
            桌面 PC
          </button>{" "}
          <button
            className="button"
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
          >
            移动 H5
          </button>
        </div>
        <Link className="button" href={r ? "/admin/" + r.kind : "/admin"}>
          返回工作台
        </Link>
        <button
          className="button"
          onClick={() => {
            window.close();
            setTimeout(() => {
              location.href = r ? "/admin/" + r.kind : "/admin";
            }, 100);
          }}
        >
          关闭预览
        </button>
      </header>
      <p className="preview-banner">
        当前为草稿预览，不记录业务曝光、访问或点击。
      </p>
      {r?.kind === "placements" && (
        <form
          className="preview-time-controls"
          onSubmit={(e) => {
            e.preventDefault();
            applyTime(previewTime);
          }}
        >
          <label htmlFor="preview-at">
            检查排期时间 · 上海时间
            <input
              id="preview-at"
              type="datetime-local"
              value={previewTime}
              onChange={(e) => setPreviewTime(e.target.value)}
            />
          </label>
          <button className="button" type="submit">
            检查此时排期
          </button>
          <button
            className="button"
            type="button"
            onClick={() => applyTime("")}
          >
            恢复当前时间
          </button>
          <p>
            留空按当前时间检查。仅基于现有草稿及关联资源检查，不预测未来的发布、暂停或素材变更。
          </p>
        </form>
      )}
      <main
        className={"preview-viewport " + (mobile ? "mobile" : "")}
        aria-busy={!r && !error}
      >
        {error ? (
          <section className="empty" role="alert">
            <Icon name="alert" size={32} />
            <h2>
              {error.status === 401
                ? "登录已过期"
                : error.status === 403
                  ? "无权预览此资源"
                  : error.status === 404
                    ? "预览资源不存在"
                    : "暂时无法加载预览"}
            </h2>
            <p>{error.message}</p>
            {error.status === 401 ? (
              <Link className="button primary" href={loginUrl}>
                重新登录
              </Link>
            ) : (
              ![400, 403, 404].includes(error.status) && (
                <button
                  className="button primary"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  重新加载
                </button>
              )
            )}
          </section>
        ) : !r ? (
          <p role="status">正在加载…</p>
        ) : (
          <>
            <div className="brand">
              <SiteMark
                src={
                  r.kind === "settings"
                    ? r.logo_url
                    : r.preview_context?.site.logo_url
                }
              />
              {r.kind === "settings"
                ? r.name
                : r.preview_context?.site.name || "精品工具导航站"}
            </div>
            {r.kind === "settings" ? (
              <>
                <div
                  className={
                    "public-site settings-nav-preview " +
                    (mobile ? "preview-mobile" : "")
                  }
                  onClickCapture={(e) => {
                    if (e.target.closest("a")) e.preventDefault();
                  }}
                >
                  <Nav site={r} />
                </div>
                <div
                  data-portal-theme={portalConfig(r.portal).theme}
                  className={
                    "public-site onenav-site settings-modules-preview " +
                    (mobile ? "preview-mobile" : "")
                  }
                  onClickCapture={(e) => {
                    if (e.target.closest("a")) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  {r.preview_context?.public && (
                    <>
                      <HomeIntro
                        data={{ ...r.preview_context.public, site: r }}
                      />
                      <HomeModules
                        data={{ ...r.preview_context.public, site: r }}
                      />
                      <PublicFooter site={r} home />
                    </>
                  )}
                </div>
                {r.preview_context?.public && (
                  <VideoSettingsPreview
                    data={r.preview_context.public}
                    site={r}
                    mobile={mobile}
                  />
                )}
                <SupportWidget site={r} preview />
                <section className="settings-seo-preview">
                  <h2>搜索结果预览</h2>
                  <strong>{r.seo_title || r.name}</strong>
                  <p>{r.seo_description}</p>
                </section>
              </>
            ) : r.kind === "placements" ? (
              <PlacementPreview resource={r} mobile={mobile} />
            ) : r.kind === "contents" ? (
              <>
                <h1>{r.title}</h1>
                {r.type !== "video" && <p>{r.brand}</p>}
                {r.type === "video" ? (
                  <Video content={r} preview />
                ) : (
                  <>
                    {(Array.isArray(r.chapters) ? r.chapters : []).map(
                      (c, i) => (
                        <section key={i}>
                          <h2>{c.title}</h2>
                          {c.pages?.map((p, j) => (
                            <img
                              src={p}
                              key={j}
                              style={{ width: "100%" }}
                              loading="lazy"
                              alt={`${c.title} ${j + 1}`}
                            />
                          ))}
                        </section>
                      ),
                    )}
                  </>
                )}
                <p>{r.summary}</p>
                <p>授权状态：{r.rights_status}</p>
              </>
            ) : (
              <article className="entry-card">
                <div className="entry-top">
                  <Picture
                    src={r.icon_url || r.logo_url}
                    alt={r.name}
                    className="entry-icon"
                  />
                  <strong>{r.name}</strong>
                </div>
                <p>{r.description || r.slug}</p>
                {r.target_url && (
                  <small className="muted">{r.target_url}</small>
                )}
                {r.kind === "placements" && (
                  <p>
                    位置：{r.location} · 设备：{r.device}
                  </p>
                )}
              </article>
            )}
          </>
        )}
      </main>
    </>
  );
}
