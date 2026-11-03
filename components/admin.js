"use client";
import AppEditor from "./app-editor";
import VideoLibrary from "./video-library";
import { entryKind } from "../lib/app-entry";
import { adActionNeedsReason, adReasonError } from "../lib/ad-action";
import AdActionConfirmation from "./ad-action-confirmation";
import {
  useAdListMetrics,
  AdMetricsSummary,
  AdMetricsCells,
} from "./ad-list-metrics";
import AdListMaterial from "./ad-list-material";
import ReturnHomeEditor from "./return-home-editor";
import { syncedContent, sourceOwnedFields } from "../lib/synced-content";
import AdWorkspace from "./ad-workspace";
import AdminNavigation from "./admin-navigation";
import AdEditor from "./ad-editor";
import AdminPagination from "./admin-pagination";
import { adminPageSize } from "../lib/admin-pagination";
import { adState, adSlots, adTemplate } from "../lib/ad-slots";
import ResourceWorkflow from "./resource-workflow";
import {
  categoryPath,
  categoryTreeOrder,
  descendantIds,
} from "../lib/category-tree";
import VideoDetailEditor from "./video-detail-editor";
import SourceIntegration from "./source-integration";
import AiEntryFill from "./ai-entry-fill";
import AiManagement from "./ai-management";
import { adminApi as api } from "../lib/admin-api";
import SiteConfigEditor from "./site-config-editor";
import {
  contentMissing,
  updatedRangeError,
  updatedInRange,
  updatedDisplay,
} from "../lib/content-readiness";
import { can, sectionAction } from "../lib/permissions";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "./icons";
import ReportTables from "./report-tables";
import SettingsTabs from "./settings-tabs";
import PortalConfigEditor from "./portal-config-editor";
import HomeModuleEditor from "./home-module-editor";
import ConfirmDialog from "./confirm-dialog";
import BatchImport from "./batch-import";
import { display } from "../lib/report-format";
import { ImageField, ChapterEditor } from "./media-editor";
import {
  fields,
  labels,
  statuses,
  defaults,
  roleNames,
  locations,
} from "../lib/catalog";
const menus = [
  ["reports", "数据报表", "chart"],
  ["entries", "站点入口", "globe"],
  ["companies", "渠道管理", "company"],
  ["categories", "分类管理", "layers"],
  ["contents", "内容管理", "play"],
  ["placements", "广告位管理", "compass"],
  ["sync", "同步任务", "refresh"],
  ["ai", "AI 能力", "activity"],
  ["audit", "操作日志", "file"],
  ["settings", "站点设置", "settings"],
  ["users", "账号与权限", "users"],
];

function Empty({
  title = "还没有内容",
  text = "从创建第一条记录开始，让每一次发现都有方向。",
  action,
}) {
  return (
    <div className="empty admin-empty">
      <span className="empty-orbit">
        <Icon name="inbox" size={27} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Badge({ status }) {
  return (
    <span className={"badge " + status}>
      <i />
      {statuses[status] || status}
    </span>
  );
}
function newAdSlug() {
  return (
    "ad-" +
    Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
  );
}
export default function Admin({ section: routeSection, initialUser }) {
  const appArea = routeSection === "apps",
    videoArea = routeSection === "video-library",
    videoManagement = routeSection === "video-management",
    comicManagement = routeSection === "comic-management",
    section = appArea
      ? "entries"
      : videoArea || videoManagement || comicManagement
        ? "contents"
        : routeSection;
  const router = useRouter(),
    sp = useSearchParams();
  const [boot, setBoot] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [mobile, setMobile] = useState(false),
    [edit, setEdit] = useState(null),
    [data, setData] = useState({}),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [errors, setErrors] = useState({}),
    [selected, setSelected] = useState([]),
    [reportResult, setReport] = useState(null),
    [reportScope, setReportScope] = useState(null),
    [extra, setExtra] = useState(null),
    [revisions, setRevisions] = useState([]),
    [confirmation, setConfirmation] = useState(null);
  const metricRange = ["today", "yesterday", "7", "30"].includes(
    sp.get("metric_range"),
  )
    ? sp.get("metric_range")
    : "7";
  const adMetrics = useAdListMetrics(
    section === "placements" && sp.get("ad_view") === "performance",
    metricRange,
  );
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("admin-sidebar-collapsed") === "1");
    } catch {}
  }, []);
  const toggleSidebar = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem("admin-sidebar-collapsed", value ? "0" : "1");
      } catch {}
      return !value;
    });
  const [impact, setImpact] = useState(null),
    [impactAttempt, setImpactAttempt] = useState(0);
  const needsAdReason =
    section === "placements" &&
    confirmation &&
    adActionNeedsReason(confirmation.action);
  const adReasonReady = !needsAdReason || !adReasonError(confirmation.reason);
  const needsImpact = confirmation?.action === "offline";
  const impactIds = needsImpact
    ? confirmation.batch
      ? selected
      : [confirmation.item.id]
    : [];
  const impactKey = impactIds.join(",");
  useEffect(() => {
    setImpact(null);
    if (!impactKey) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    const params = new URLSearchParams();
    impactKey.split(",").forEach((id) => params.append("id", id));
    (async () => {
      try {
        const response = await fetch("/api/admin/impact?" + params, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.message || "暂时无法读取影响范围");
        if (active) setImpact({ data: result, key: impactKey });
      } catch (e) {
        if (active)
          setImpact({
            error:
              e.name === "AbortError"
                ? "读取超时，请重试"
                : e.message || "读取失败，请重试",
          });
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [impactKey, impactAttempt]);
  const [batchResults, setBatchResults] = useState([]);
  const confirming = useRef(false);
  const [uploading, setUploading] = useState(0);
  const onUploadBusy = (active) =>
    setUploading((n) => Math.max(0, n + (active ? 1 : -1)));
  const user = initialUser;
  const canWrite = user.role !== "viewer",
    canPublish = ["super", "operator"].includes(user.role),
    canExport = canPublish;
  const query = sp.get("q") || "",
    status = sp.get("status") || "",
    company = sp.get("company_id") || "",
    type = sp.get("type") || "",
    requestedPage = Math.max(1, parseInt(sp.get("page")) || 1),
    category = sp.get("category_id") || "",
    source = sp.get("source_system") || "",
    sort = sp.get("sort") || "order";
  const completeness = sp.get("completeness") || "",
    updatedStart = sp.get("updated_start") || "",
    updatedEnd = sp.get("updated_end") || "";
  const dateError =
    section === "contents" ? updatedRangeError(updatedStart, updatedEnd) : "";
  const impactReady =
    !needsImpact || (impact?.key === impactKey && !!impact?.data);
  const title =
    (videoArea
      ? "视频库"
      : videoManagement
        ? "视频管理"
        : comicManagement
          ? "漫画管理"
          : appArea
            ? "APP 下载"
            : section === "entries"
              ? "网址管理"
              : section === "placements"
                ? "广告位管理"
                : section === "companies"
                  ? "渠道管理"
                  : boot?.site?.admin_menu_labels?.[section]) ||
    menus.find((m) => m[0] === section)?.[1] ||
    "修改密码";
  const currentReportScope = section + "?" + sp.toString();
  const report = reportScope === currentReportScope ? reportResult : null;
  const loadVersion = useRef(0),
    historyVersion = useRef(0);
  async function load() {
    const version = ++loadVersion.current;
    ++historyVersion.current;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const b = await api(
        "admin/bootstrap?" +
          (section === "dashboard"
            ? "range=7"
            : section === "reports"
              ? sp.toString()
              : section === "placements"
                ? "include_stats=0&include_ad_context=1"
                : "include_stats=0"),
      );
      if (version !== loadVersion.current) return;
      const nextExtra = ["sync", "ai", "audit", "users"].includes(section)
        ? await api("admin/" + section)
        : null;
      if (version !== loadVersion.current) return;
      const history =
        section === "settings" ? await api("admin/revisions?id=site") : null;
      if (version !== loadVersion.current) return;
      setBoot(b);
      setReport(b.stats);
      setReportScope(currentReportScope);
      setExtra(nextExtra);
      if (section === "settings") {
        const site = b.resources.find((r) => r.id === "site");
        setEdit(site);
        setData(site);
        setDirty(false);
        setErrors({});
        setRevisions(history);
      }
    } catch (e) {
      if (version !== loadVersion.current) return;
      if (e.status === 401) {
        location.href =
          "/admin/login?next=" +
          encodeURIComponent(location.pathname + location.search);
        return;
      }
      setError(e.message);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    setEdit(null);
    setErrors({});
    setNotice("");
    setSelected([]);
    setBatchResults([]);
    load();
    return () => {
      ++loadVersion.current;
      ++historyVersion.current;
    };
  }, [routeSection, sp.toString()]);
  useEffect(() => {
    const f = (e) => {
      if (dirty || uploading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [dirty, uploading]);
  function filters(changes) {
    const p = new URLSearchParams(sp);
    Object.entries(changes).forEach(([k, v]) =>
      v ? p.set(k, v) : p.delete(k),
    );
    if (!Object.hasOwn(changes, "page")) p.delete("page");
    if (!Object.hasOwn(changes, "report_page")) p.delete("report_page");
    router.push(
      "/admin/" + (section === "dashboard" ? "" : routeSection) + "?" + p,
    );
  }
  async function refreshData() {
    if (uploading || saving) return;
    if (dirty && !confirm("刷新将放弃未保存的修改，确定继续吗？")) return;
    await load();
  }
  async function openEdit(item, preset = {}) {
    if (!item && (videoArea || videoManagement || comicManagement))
      preset = { ...preset, type: comicManagement ? "comic" : "video" };
    if (dirty && !confirm("有未保存的修改，确定离开吗？")) return;
    const version = ++historyVersion.current;
    setEdit(item || { id: null });
    setData(
      item || {
        ...defaults(section),
        ...(section === "entries"
          ? {
              entry_kind: appArea ? "app" : "website",
              ...(appArea
                ? {
                    slug: newAdSlug().replace("ad-", "app-"),
                    action_mode: "download",
                    target_type: "download",
                  }
                : {}),
            }
          : {}),
        ...(section === "placements"
          ? {
              slug: newAdSlug(),
              ...(adSlots[sp.get("slot")]
                ? {
                    location: sp.get("slot"),
                    template: adSlots[sp.get("slot")].templates[0],
                    device: adSlots[sp.get("slot")].devices?.[0] || "all",
                  }
                : {}),
            }
          : {}),
        ...preset,
      },
    );
    setDirty(false);
    setErrors({});
    setRevisions([]);
    setError("");
    if (item?.id) {
      try {
        const history = await api("admin/revisions?id=" + item.id);
        if (version === historyVersion.current) setRevisions(history);
      } catch (e) {
        if (version === historyVersion.current)
          setError("历史版本读取失败：" + e.message);
      }
    }
  }
  async function action(item, act, more = {}) {
    setSaving(true);
    setError("");
    try {
      await api("admin/" + section, {
        id: item.id,
        version: item.version,
        action: act,
        ...more,
      });
      setNotice(
        {
          publish: "发布成功，前台已更新",
          offline: "已下架，前台不再展示",
          submit: "已提交待发布",
          delete: "已删除",
          rollback: "已恢复所选发布版本",
          exclude: "已人工排除，后续同步不会自动恢复",
          include: "已恢复候选，请重新审核后发布",
          pause: "广告已暂停，停止展示与旧广告链接跳转",
          resume: "广告已恢复，按排期展示",
        }[act],
      );
      setEdit(null);
      setDirty(false);
      await load();
    } catch (e) {
      setError(e.message);
      setErrors(e.fields || {});
    } finally {
      setSaving(false);
      setConfirmation(null);
    }
  }
  async function save(e) {
    e.preventDefault();
    if (uploading || saving) return;
    setSaving(true);
    setErrors({});
    setError("");
    setNotice("");
    try {
      const publishNow =
        section === "placements" &&
        canPublish &&
        e.nativeEvent.submitter?.value === "publish";
      const payload =
        section === "placements"
          ? {
              ...data,
              name:
                data.name?.trim() ||
                [locations[data.location]?.label, name(data.entry_id)]
                  .filter(Boolean)
                  .join(" · ")
                  .slice(0, 100),
            }
          : section === "entries"
            ? {
                ...data,
                entry_kind: appArea ? "app" : "website",
                ...(appArea
                  ? { action_mode: "download", target_type: "download" }
                  : {}),
              }
            : data;
      const result = await api("admin/" + section, {
        id: edit.id,
        version: edit.version,
        action: "save",
        data: payload,
      });
      const saved = result.resource;
      setEdit(saved);
      setData(saved);
      setDirty(false);
      setBoot((previous) => ({
        ...previous,
        resources: previous.resources.some((r) => r.id === saved.id)
          ? previous.resources.map((r) => (r.id === saved.id ? saved : r))
          : [saved, ...previous.resources],
      }));
      if (publishNow) {
        try {
          await api("admin/placements", {
            id: saved.id,
            version: saved.version,
            action: "publish",
            reason: edit.has_published
              ? "管理员保存并更新广告投放"
              : "管理员保存并投放广告",
          });
          setNotice("广告已保存并投放。");
          setEdit(null);
        } catch (error) {
          setNotice("草稿已保存，投放未成功。请按提示修改后重试。");
          throw error;
        }
      } else setNotice("草稿已保存，发布后才会在前台生效。");
      try {
        const b = await api(
          "admin/bootstrap?include_stats=0" +
            (section === "placements" ? "&include_ad_context=1" : ""),
        );
        setBoot(b);
      } catch (e) {
        setError("草稿已保存，但列表刷新失败。" + e.message);
      }
    } catch (e) {
      setErrors(e.fields || {});
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const resources = boot?.resources || [];
  const name = (id) =>
    resources.find((r) => r.id === id)?.name ||
    resources.find((r) => r.id === id)?.title ||
    "—";
  const missingById = new Map(
    resources
      .filter((r) => r.kind === "contents")
      .map((r) => [r.id, contentMissing(r, resources)]),
  );
  let list = resources.filter(
    (r) =>
      r.kind === section &&
      (section !== "entries" ||
        entryKind(r) === (appArea ? "app" : "website")) &&
      (!query ||
        [r.name, r.title, r.slug, r.source_id]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!status || r.status === status) &&
      (section !== "placements" ||
        ((!sp.get("slot") || r.location === sp.get("slot")) &&
          (!sp.get("ad_device") || r.device === sp.get("ad_device")) &&
          (!sp.get("ad_type") ||
            (r.ad_type || "internal") === sp.get("ad_type")))) &&
      (!company || r.company_id === company) &&
      (!(videoArea || videoManagement || comicManagement)
        ? !type || r.type === type
        : comicManagement
          ? r.type === "comic"
          : r.type === "video") &&
      (!category || (r.category_ids || []).includes(category)) &&
      (!source || r.source_system === source) &&
      (section !== "contents" ||
        (!dateError &&
          updatedInRange(r.updated_at, updatedStart, updatedEnd) &&
          (completeness === "incomplete"
            ? missingById.get(r.id)?.length > 0
            : completeness === "complete"
              ? missingById.get(r.id)?.length === 0
              : true))),
  );
  let sorted = list.sort(
    (a, b) =>
      (sort === "updated"
        ? String(b.updated_at).localeCompare(String(a.updated_at))
        : sort === "name"
          ? String(a.name || a.title || "").localeCompare(
              String(b.name || b.title || ""),
              "zh-CN",
            )
          : (a.sort_order || 0) - (b.sort_order || 0) ||
            String(b.updated_at).localeCompare(String(a.updated_at))) ||
      a.id.localeCompare(b.id),
  );
  const categories = resources.filter((r) => r.kind === "categories");
  if (section === "categories" && sort === "order") {
    const visible = new Set(sorted.map((r) => r.id));
    sorted = categoryTreeOrder(
      [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    ).filter((r) => visible.has(r.id));
  }
  const pageSize = adminPageSize(sp.get("page_size")),
    page = Math.min(
      requestedPage,
      Math.max(
        1,
        Math.ceil(
          (section === "audit" ? extra?.length || 0 : list.length) / pageSize,
        ),
      ),
    ),
    hasFilters = !!(
      sp.get("slot") ||
      sp.get("ad_device") ||
      sp.get("ad_type") ||
      query ||
      status ||
      company ||
      type ||
      category ||
      source ||
      (section === "contents" && (completeness || updatedStart || updatedEnd))
    );
  const clearFilters = () =>
    filters({
      sort: "",
      slot: "",
      ad_device: "",
      ad_type: "",
      q: "",
      status: "",
      company_id: "",
      type: "",
      category_id: "",
      source_system: "",
      completeness: "",
      updated_start: "",
      updated_end: "",
    });
  function field([key, label, ft, required]) {
    if ((videoArea || videoManagement || comicManagement) && key === "type")
      return null;
    if (
      section === "entries" &&
      (["entry_kind", "app_meta"].includes(key) ||
        (!appArea &&
          ["android_url", "ios_url", "action_mode", "target_type"].includes(
            key,
          )))
    )
      return null;
    if (
      section === "placements" &&
      ((key === "category_id" && data.location !== "category") ||
        (key === "content_id" && data.location !== "detail"))
    )
      return null;
    if (
      section === "contents" &&
      data.type !== "video" &&
      [
        "source_site_id",
        "source_site_name",
        "video_type",
        "original_title",
        "director",
        "actors",
        "release_date",
        "region",
        "language",
        "duration_seconds",
        "rating",
      ].includes(key)
    )
      return null;
    if (
      section === "contents" &&
      ((key === "chapters" && data.type !== "comic") ||
        (["play_url", "media_format"].includes(key) && data.type !== "video") ||
        (["company_id", "brand"].includes(key) && data.type === "video"))
    )
      return null;
    if (
      section === "contents" &&
      syncedContent(edit) &&
      sourceOwnedFields.includes(key)
    )
      return (
        <div key={key} className="form-field">
          <label htmlFor={"field-" + key}>{label} · 上游只读</label>
          <textarea
            id={"field-" + key}
            readOnly
            value={
              Array.isArray(data[key])
                ? JSON.stringify(data[key], null, 2)
                : String(data[key] ?? "")
            }
            rows={["summary", "chapters"].includes(key) ? 4 : 2}
          />
        </div>
      );
    const value =
      data[key] ??
      {
        action_mode: "visit",
        landing_mode: "inherit",
        ad_type: "internal",
        template: "card",
        image_fit: "contain",
        priority: 0,
      }[key] ??
      "";
    const change = (v) => {
      setData((previous) => ({
        ...previous,
        [key]: v,
        ...(section === "placements" &&
        [
          "pc_image_url",
          "h5_image_url",
          "location",
          "template",
          "image_fit",
        ].includes(key)
          ? { crop_verified: false }
          : {}),
        ...(section === "placements" && key === "location"
          ? {
              category_id: "",
              content_id: "",
              template: adSlots[v]?.templates[0] || "card",
              device: adSlots[v]?.devices?.[0] || "all",
            }
          : {}),
      }));
      setDirty(true);
    };
    let options = [];
    if (["company", "category", "entry", "content"].includes(ft)) {
      const kind = {
        company: "companies",
        category: "categories",
        entry: "entries",
        content: "contents",
      }[ft];
      options = resources
        .filter((r) => r.kind === kind && r.id !== edit.id)
        .map((r) => [
          r.id,
          (r.name || r.title) + (r.has_published ? "" : " · 未发布"),
        ]);
    }
    if (ft === "category") {
      const excluded =
        key === "parent_id" && edit.id
          ? descendantIds(edit.id, categories)
          : new Set();
      options = categoryTreeOrder(categories)
        .filter((r) => !excluded.has(r.id))
        .map((r) => [
          r.id,
          categoryPath(r.id, categories)
            .map((c) => c.name)
            .join(" / ") + (r.has_published ? "" : " · 未发布"),
        ]);
    }
    if (ft === "mediaformat")
      options = [
        ["auto", "自动识别 MP4 / WebM / m3u8"],
        ["file", "MP4 / WebM 文件"],
        ["hls", "HLS 流媒体（含无后缀地址）"],
      ];
    if (ft === "rights")
      options = [
        ["unknown", "权利尚未确认"],
        ["approved", "已授权站内展示"],
        ["revoked", "授权已撤回"],
      ];
    if (ft === "videotype")
      options = [
        ["movie", "电影"],
        ["series", "剧集"],
        ["episode", "单集"],
        ["short_drama", "短剧"],
      ];
    if (ft === "contenttype")
      options = [
        ["video", "视频"],
        ["comic", "漫画"],
      ];
    if (ft === "adfit")
      options = [
        ["contain", "完整展示（保留全部内容，可能留边）"],
        ["cover", "居中裁切（需预览确认安全区）"],
      ];
    if (ft === "adtype")
      options = [
        ["internal", "内部推广"],
        ["external", "外部合作广告"],
      ];
    if (ft === "adtemplate")
      options = (adSlots[data.location]?.templates || ["card"]).map((t) => [
        t,
        t === "card"
          ? "入口卡片"
          : data.location === "home_banner"
            ? "图片横幅（轮播）"
            : "图片横幅",
      ]);
    if (ft === "landingmode")
      options = [
        ["inherit", "跟随全站设置"],
        ["landing", "开启：先进入落地页"],
        ["direct", "关闭：直接访问目标"],
      ];
    if (ft === "actionmode")
      options = [
        ["visit", "直接访问网站"],
        ["download", "按终端下载（缺少对应地址时进入通用页）"],
      ];
    if (ft === "target")
      options = [
        ["website", "外部网站"],
        ["download", "下载入口"],
        ["store", "应用商店"],
      ];
    if (ft === "location")
      options = Object.entries(locations).map(([k, v]) => [
        k,
        v.label + ` · 最多 ${v.capacity} 项`,
      ]);
    if (ft === "device")
      options = [
        ["all", "全部设备"],
        ["pc", "桌面端"],
        ["h5", "移动端"],
      ].filter(
        ([value]) =>
          section !== "placements" ||
          !adSlots[data.location]?.devices ||
          adSlots[data.location].devices.includes(value),
      );
    const attrs = {
      id: "field-" + key,
      "aria-invalid": !!errors[key],
      "aria-describedby": errors[key] ? "error-" + key : undefined,
      required,
      disabled: !canWrite || saving,
    };
    let input;
    if (["categories", "entries"].includes(ft)) {
      const kind = ft === "categories" ? "categories" : "entries";
      input = (
        <div className="multi-options">
          {resources
            .filter((r) => r.kind === kind)
            .map((r) => (
              <label key={r.id}>
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(r.id)}
                  disabled={!canWrite || saving}
                  onChange={(e) =>
                    change(
                      e.target.checked
                        ? [...(value || []), r.id]
                        : (value || []).filter((id) => id !== r.id),
                    )
                  }
                />
                {kind === "categories"
                  ? categoryPath(r.id, categories)
                      .map((c) => c.name)
                      .join(" / ")
                  : r.name}
              </label>
            ))}
          {!resources.some((r) => r.kind === kind) && (
            <span className="muted">
              请先创建{ft === "categories" ? "分类" : "站点入口"}
            </span>
          )}
        </div>
      );
    } else if (
      [
        "page_copy",
        "navigation",
        "footer_navigation",
        "admin_menu_labels",
        "support_channels",
      ].includes(ft)
    )
      input = (
        <SiteConfigEditor
          kind={ft}
          value={value}
          onChange={change}
          disabled={!canWrite || saving || uploading > 0}
          onBusy={onUploadBusy}
          groupAttrs={{
            id: attrs.id,
            role: "group",
            tabIndex: -1,
            "aria-label": label,
            "aria-invalid": attrs["aria-invalid"],
            "aria-describedby": attrs["aria-describedby"],
          }}
        />
      );
    else if (ft === "video_detail")
      input = (
        <VideoDetailEditor
          value={value}
          onChange={change}
          disabled={!canWrite || saving || uploading > 0}
          attrs={{
            id: attrs.id,
            "aria-invalid": attrs["aria-invalid"],
            "aria-describedby": attrs["aria-describedby"],
          }}
        />
      );
    else if (ft === "return_home")
      input = (
        <ReturnHomeEditor
          value={value}
          onChange={change}
          disabled={!canWrite || saving}
          attrs={{
            id: attrs.id,
            "aria-invalid": attrs["aria-invalid"],
            "aria-describedby": attrs["aria-describedby"],
          }}
        />
      );
    else if (ft === "portal")
      input = (
        <PortalConfigEditor
          value={value}
          onChange={change}
          disabled={!canWrite || saving}
        />
      );
    else if (ft === "home_modules")
      input = (
        <HomeModuleEditor
          value={value}
          onChange={change}
          disabled={!canWrite || saving}
        />
      );
    else if (ft === "checkbox")
      input = (
        <label className="toggle-label">
          <input
            {...attrs}
            type="checkbox"
            checked={!!value}
            onChange={(e) => change(e.target.checked)}
          />
          <span>启用</span>
        </label>
      );
    else if (ft === "json")
      input = (
        <ChapterEditor
          value={value}
          onChange={change}
          disabled={!canWrite || saving}
          onBusy={onUploadBusy}
        />
      );
    else if (["pc_image_url", "h5_image_url"].includes(key))
      input = (
        <ImageField
          value={value}
          onChange={change}
          attrs={attrs}
          purpose={adTemplate(data) === "banner" ? "cover" : "icon"}
          recommendation={
            (key === "pc_image_url"
              ? adSlots[data.location]?.pc
              : adSlots[data.location]?.h5) +
            "；横幅需为对应终端提供素材，留空不展示该端。卡片可沿用站点图标。"
          }
          onBusy={onUploadBusy}
        />
      );
    else if (["icon_url", "logo_url", "cover_url"].includes(key))
      input = (
        <ImageField
          value={value}
          onChange={change}
          attrs={attrs}
          purpose={key === "cover_url" ? "cover" : "icon"}
          recommendation={
            key !== "cover_url"
              ? "建议 512 × 512 px，正方形"
              : section === "settings"
                ? "建议 1600 × 600 px，重要内容居中；不同屏幕会裁切"
                : data.type === "comic"
                  ? "建议 900 × 1200 px，3:4 竖版封面"
                  : "建议 1280 × 720 px，16:9 横版封面"
          }
          onBusy={onUploadBusy}
        />
      );
    else if (ft === "textarea")
      input = (
        <textarea
          {...attrs}
          rows={3}
          value={value}
          onChange={(e) => change(e.target.value)}
        />
      );
    else if (ft === "tags")
      input = (
        <input
          {...attrs}
          value={Array.isArray(value) ? value.join(", ") : value}
          onChange={(e) =>
            change(
              e.target.value
                .split(/[,，]/)
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      );
    else if (
      options.length ||
      ["company", "category", "entry", "content"].includes(ft)
    )
      input = (
        <select
          {...attrs}
          value={value}
          onChange={(e) => change(e.target.value)}
        >
          <option value="">
            {key === "parent_id" ? "无上级（一级分类）" : "请选择" + label}
          </option>
          {options.map(([v, t]) => (
            <option value={v} key={v}>
              {t}
            </option>
          ))}
        </select>
      );
    else
      input = (
        <input
          {...attrs}
          type={ft === "url" ? "text" : ft}
          step={key === "rating" ? "0.1" : undefined}
          value={value}
          onChange={(e) =>
            change(ft === "number" ? Number(e.target.value) : e.target.value)
          }
          maxLength={ft === "url" ? 2048 : undefined}
        />
      );
    return (
      <div
        key={key}
        className={
          [
            "portal",
            "textarea",
            "json",
            "categories",
            "entries",
            "home_modules",
            "return_home",
            "video_detail",
            "page_copy",
            "navigation",
            "footer_navigation",
            "admin_menu_labels",
            "support_channels",
          ].includes(ft)
            ? "form-field wide"
            : "form-field"
        }
      >
        <label htmlFor={"field-" + key}>
          {label}
          {required && <em> *</em>}
        </label>
        {input}
        {key === "parent_id" && (
          <small className="muted">
            留空为一级分类；选择上级可创建二级、三级及更多层级。不能选择自身或下级。
          </small>
        )}
        {key === "entry_ids" && (
          <small className="muted">
            来自“站点入口”模块，发布后显示在内容详情的相关产品区。
            <Link href="/admin/entries" onClick={safeNav}>
              管理站点入口 →
            </Link>
          </small>
        )}
        {["android_url", "ios_url"].includes(key) && (
          <small className="muted">
            只在“按终端下载”时使用。留空会进入通用落地页；点击不代表下载或安装完成。
          </small>
        )}
        {key === "target_url" && (
          <small className="muted">
            桌面端、无法识别的设备及缺少对应下载地址的设备直接访问此页。
          </small>
        )}
        {key === "play_url" && (
          <small className="muted">
            支持 MP4、WebM 和 HLS；填写可直接播放的媒体地址。HLS
            清单、分片及密钥需允许本站跨域访问，无后缀 HLS 地址请选择对应格式。
          </small>
        )}
        {errors[key] && (
          <small id={"error-" + key} className="error-message">
            {errors[key]}
          </small>
        )}
      </div>
    );
  }
  function preview(item) {
    window.open("/admin/preview?id=" + item.id, "_blank", "noopener");
  }
  const safeNav = (e) => {
    const target = new URL(e.currentTarget.href, location.href);
    if (
      target.pathname === location.pathname &&
      target.search === location.search &&
      target.hash &&
      ["settings", "ai"].includes(section)
    ) {
      setMobile(false);
      return;
    }
    if (uploading) {
      e.preventDefault();
      setNotice("图片仍在上传，请完成后再离开。");
      return;
    }
    if (dirty && !confirm("有未保存的修改，确定离开吗？")) e.preventDefault();
    else {
      setDirty(false);
      setMobile(false);
    }
  };
  const stats = report?.metrics || {};
  return (
    <div
      className={
        "admin-app" +
        (section === "placements"
          ? " ad-management"
          : section === "ai"
            ? " ai-management"
            : "") +
        (collapsed ? " sidebar-collapsed" : "")
      }
    >
      <aside className={"admin-sidebar " + (mobile ? "visible" : "")}>
        <Link href="/admin" className="brand" onClick={safeNav}>
          <span className="brand-icon">
            <Icon name="compass" size={26} />
          </span>
          <span>
            {boot?.site?.name || "精品工具导航站"}
            <small>运营工作台</small>
          </span>
        </Link>
        <button
          className="sidebar-collapse button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "展开菜单栏" : "折叠菜单栏"}
          aria-expanded={!collapsed}
        >
          <Icon name={collapsed ? "right" : "left"} size={17} />
          <span>{collapsed ? "" : "收起菜单"}</span>
        </button>
        <div className="workspace-label">
          WORKSPACE <span>工作空间</span>
        </div>
        <AdminNavigation
          role={user.role}
          section={routeSection}
          params={sp}
          collapsed={collapsed && !mobile}
          onExpand={toggleSidebar}
          onNavigate={safeNav}
        />
        <div className="sidebar-bottom">
          <Link
            href="/"
            target="_blank"
            aria-label="查看导航站"
            title="查看导航站"
          >
            <Icon name="external" size={17} />
            <span className="admin-menu-label">查看导航站</span>
          </Link>
          <div className="user-card">
            <span className="avatar">{user.name.slice(0, 1)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{roleNames[user.role]}</small>
            </div>
            <button
              className="icon-button"
              title="退出登录"
              onClick={async () => {
                if (dirty && !confirm("未保存的内容将丢失，确定退出？")) return;
                try {
                  await api("auth/logout", {});
                  location.href = "/admin/login";
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              <Icon name="logout" size={17} />
            </button>
          </div>
          <Link
            href="/admin/password"
            onClick={safeNav}
            className="password-link"
            aria-label="修改登录密码"
            title="修改登录密码"
          >
            <Icon name="shield" size={17} />
            <span className="admin-menu-label">修改登录密码</span>
          </Link>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="关闭侧栏"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(!mobile)}
              aria-label="打开工作台菜单"
            >
              <Icon name="menu" />
            </button>
            <span>工作空间</span>
            <Icon name="right" size={13} />
            <strong>{title}</strong>
          </div>
          <div>
            <span className="environment">
              <i />
              运营工作台
            </span>
            <span className="avatar small">{user.name.slice(0, 1)}</span>
          </div>
        </header>
        <main className="admin-main">
          <div className="admin-page-heading">
            <div>
              <span className="eyebrow">TOOLS WORKSPACE</span>
              <h1>
                {edit && section !== "settings"
                  ? (edit.id ? "编辑" : "新建") +
                    (section === "placements" ? "广告" : title)
                  : title}
              </h1>
              <p>
                {section === "placements"
                  ? "维护广告与投放，按需查看广告位置和效果。"
                  : section === "dashboard"
                    ? "待办、提醒与日常维护，从这里开始。"
                    : section === "reports"
                      ? "从真实访问出发，了解产品与内容的表现。"
                      : section === "sync"
                        ? "统一管理内容来源、导入进度和异常。"
                        : section === "settings"
                          ? "管理站点品牌、页面文案与内容发布条件。"
                          : "管理、整理与发布，让好的内容有序呈现。"}
              </p>
            </div>
            <div className="heading-actions">
              {edit && section !== "settings" ? (
                <button
                  className="button"
                  onClick={() => {
                    if (
                      !uploading &&
                      (!dirty || confirm("放弃未保存的修改？"))
                    ) {
                      ++historyVersion.current;
                      setEdit(null);
                      setDirty(false);
                      setError("");
                    }
                  }}
                >
                  <Icon name="left" size={16} />
                  返回列表
                </button>
              ) : fields[section] && section !== "settings" && canWrite ? (
                <>
                  <button className="button primary" onClick={() => openEdit()}>
                    <Icon name="plus" size={17} />
                    新建
                    {section === "placements"
                      ? "广告"
                      : title.replace("管理", "")}
                  </button>
                  {canWrite &&
                    !appArea &&
                    ["entries", "companies", "categories"].includes(
                      section,
                    ) && (
                      <BatchImport
                        kind={section}
                        resources={resources}
                        onDone={refreshData}
                      />
                    )}
                </>
              ) : (
                <button
                  className="button"
                  onClick={refreshData}
                  disabled={loading || saving || uploading > 0}
                >
                  <Icon name="refresh" size={16} />
                  刷新数据
                </button>
              )}
            </div>
          </div>
          {!edit &&
            ["companies", "categories", "contents"].includes(section) && (
              <section className="admin-module-guide" aria-label="模块说明">
                {section === "companies" ? (
                  <p>
                    渠道用于管理站点入口和内容的归属，同一渠道下可维护多个入口；报表按归属渠道统计。推广渠道码用于单次导流来源识别，两者独立。
                  </p>
                ) : section === "categories" ? (
                  <p>
                    按上级分类组织目录，支持一级、二级及更多层级；可直接添加子分类。先发布上级，再发布下级。
                  </p>
                ) : section === "placements" ? (
                  <>
                    <strong>统一管理全站广告与推广</strong>
                    <p>
                      选择已审核站点目标、素材模板、终端与排期。广告明确标识；无有效素材的终端不展示。自然相关推荐由内容规则独立生成。
                    </p>
                    <Link href="/admin/entries" onClick={safeNav}>
                      管理可推荐的站点入口 →
                    </Link>
                  </>
                ) : (
                  <>
                    <p>
                      同步导入的视频与漫画先进入候选列表，补齐资料并审核发布后才出现在前台。“关联站点入口”来自站点入口模块。
                    </p>
                    <Link
                      href="/admin/contents?status=candidate"
                      onClick={safeNav}
                    >
                      查看待审核候选内容 →
                    </Link>
                  </>
                )}
              </section>
            )}
          {error && (
            <div role="alert" className="alert error">
              <Icon name="alert" />
              <div>
                {error}
                <button onClick={() => setError("")} className="text-button">
                  收起
                </button>
              </div>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              <Icon name="check" />
              {notice}
              <button
                className="icon-button"
                aria-label="关闭提示"
                onClick={() => setNotice("")}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div
              className="dashboard-skeleton"
              aria-label="加载中"
              aria-busy="true"
            >
              <div className="skeleton hero-skeleton" />
              <div className="skeleton hero-skeleton" />
            </div>
          ) : !boot ? (
            <Empty
              title="数据加载失败"
              text="服务暂不可用，请重试。"
              action={
                <button className="button" onClick={load}>
                  重新加载
                </button>
              }
            />
          ) : (
            <>
              {section === "reports" && !report && (
                <section className="panel">
                  <ReportFilters
                    sp={sp}
                    filters={filters}
                    resources={resources}
                    canDebug={can(user.role, "audit")}
                  />
                  <Empty
                    title="统计暂时无法读取"
                    text="当前无法显示可靠的报表数据，请稍后重试。资源管理仍可使用。"
                    action={
                      <button className="button" onClick={refreshData}>
                        重试统计
                      </button>
                    }
                  />
                  {boot.stats_error?.request_id && (
                    <p className="overview-note">
                      问题编号：{boot.stats_error.request_id}
                    </p>
                  )}
                </section>
              )}
              {section === "reports" && report && (
                <>
                  <ReportFilters
                    sp={sp}
                    filters={filters}
                    resources={resources}
                    canDebug={can(user.role, "audit")}
                  />
                  {report.filters?.traffic && (
                    <div className="alert" role="status">
                      {report.filters.traffic === "test"
                        ? "排查模式：仅显示测试与机器人记录，不代表真实业务流量。"
                        : "排查模式：包含测试与机器人记录，不代表真实业务流量。"}
                    </div>
                  )}
                  {report.resource_modes &&
                    (report.resource_modes.demo > 0 ||
                      report.resource_modes.unknown > 0) && (
                      <div className="alert" role="status">
                        当前筛选包含 {report.resource_modes.demo}{" "}
                        条演示资源事件、{report.resource_modes.unknown}{" "}
                        条历史资源性质未知事件，不能直接作为正式经营成果。可按资源性质单独筛选；该分类与测试/机器人流量相互独立。
                      </div>
                    )}
                  <div className="metric-grid">
                    {[
                      ["访问量 PV", stats.pv, "eye"],
                      ["访客数 UV", "—", "users"],
                      ["产品入口点击", stats.clicks, "external"],
                      ["推广位点击", stats.promotions, "compass"],
                      ["视频有效播放", stats.video, "play"],
                      ["漫画阅读开启", stats.comic, "book"],
                    ].map(([label, n, icon]) => (
                      <Link
                        href={"/admin/reports?" + sp.toString()}
                        className="metric-card"
                        key={label}
                      >
                        <div>
                          <span>{label}</span>
                          <Icon name={icon} size={18} />
                        </div>
                        <strong>{n ?? "—"}</strong>
                        <small>
                          {label === "访客数 UV"
                            ? "匿名标识口径待确认"
                            : "统计周期内真实事件"}
                        </small>
                      </Link>
                    ))}
                  </div>
                  <section className="panel trend-panel">
                    <div className="panel-title">
                      <div>
                        <h2>访问与导流趋势</h2>
                        <p>了解每一天的发现</p>
                      </div>
                      <span className="chart-legend">
                        <i />
                        访问量 <i />
                        入口点击
                      </span>
                    </div>
                    {report.trend.length ? (
                      <div className="trend-chart">
                        {report.trend.map((t) => (
                          <div className="trend-day" key={t.day}>
                            <div className="bars">
                              <div
                                title={"访问量 " + t.pv}
                                style={{
                                  height: Math.max(
                                    2,
                                    (t.pv /
                                      Math.max(
                                        ...report.trend.map((t) =>
                                          Math.max(t.pv, t.clicks),
                                        ),
                                        1,
                                      )) *
                                      155,
                                  ),
                                }}
                              />
                              <div
                                title={"点击 " + t.clicks}
                                style={{
                                  height: Math.max(
                                    2,
                                    (t.clicks /
                                      Math.max(
                                        ...report.trend.map((t) =>
                                          Math.max(t.pv, t.clicks),
                                        ),
                                        1,
                                      )) *
                                      155,
                                  ),
                                }}
                              />
                            </div>
                            <small>{t.day.slice(5)}</small>
                            <span>
                              {t.pv} / {t.clicks}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title="等待第一条访问记录"
                        text="真实访客访问后，趋势将在这里呈现。"
                      />
                    )}
                  </section>
                  <section className="panel">
                    <div className="panel-title">
                      <div>
                        <h2>渠道导流排行</h2>
                        <p>点击时的渠道归属快照，不随后续编辑变化</p>
                      </div>
                      {canExport && (
                        <a
                          className="button"
                          href={
                            "/api/admin/report?" +
                            new URLSearchParams({
                              ...Object.fromEntries(sp),
                              view: "companies",
                              export: "csv",
                            }).toString()
                          }
                        >
                          <Icon name="download" size={16} />
                          导出报表
                        </a>
                      )}
                    </div>
                    {report.companies.length ? (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>渠道</th>
                              <th>有效点击</th>
                              <th>独立点击会话</th>
                              <th>占比</th>
                              <th>环比</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.companies.map((c, i) => (
                              <tr key={c.company_id || i}>
                                <td>
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      router.push(
                                        "/admin/reports?" +
                                          new URLSearchParams({
                                            ...Object.fromEntries(sp),
                                            company_id:
                                              c.company_id || "unassigned",
                                            view: "entries",
                                          }),
                                      )
                                    }
                                  >
                                    {c.name}
                                  </button>
                                </td>
                                <td>{c.clicks}</td>
                                <td>{c.sessions}</td>
                                <td>
                                  {stats.clicks
                                    ? display(c.share, "percent")
                                    : "—"}
                                </td>
                                <td>{display(c.change, "change")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty
                        title="还没有渠道导流记录"
                        text="已发布入口被访客点击后，会按渠道汇总展示。"
                      />
                    )}
                  </section>
                  {section === "reports" && (
                    <ReportTables
                      report={report}
                      sp={sp}
                      filters={filters}
                      canExport={canExport}
                    />
                  )}
                  <div className="data-caption">
                    <Icon name="check" size={14} />
                    数据来源：本站 MySQL · 时区：Asia/Shanghai · 更新于{" "}
                    {new Date(report.updated_at).toLocaleString("zh-CN", {
                      timeZone: "Asia/Shanghai",
                    })}{" "}
                    ·{" "}
                    {report.filters?.traffic === "test"
                      ? "仅测试与机器人"
                      : report.filters?.traffic === "all"
                        ? "包含测试与机器人"
                        : "默认排除预览、自动化测试与机器人"}
                  </div>
                  {report.health_status === "unavailable" && (
                    <div className="alert" role="status">
                      告警信息暂时无法读取，请刷新重试；报表数据仍正常显示。
                    </div>
                  )}
                  {report.health.map((h) => (
                    <div className="alert" key={h.name}>
                      {h.message} · {h.updated_at}
                    </div>
                  ))}
                </>
              )}
              {batchResults.length > 0 && (
                <section className="panel" aria-label="批量处理结果">
                  <div className="panel-title">
                    <div>
                      <h2>批量处理结果</h2>
                      <p>逐条查看结果，失败资源已保留选择，可处理后重试。</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setBatchResults([])}
                    >
                      收起结果
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>资源</th>
                          <th>结果</th>
                          <th>说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((r) => (
                          <tr key={r.id}>
                            <td>{r.name}</td>
                            <td>
                              <span
                                className={
                                  "badge " + (r.ok ? "published" : "offline")
                                }
                              >
                                {r.ok ? "成功" : "失败"}
                              </span>
                            </td>
                            <td>{r.ok ? "操作已完成" : r.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              {section === "placements" && !edit && (
                <AdWorkspace
                  pageSize={pageSize}
                  items={sorted}
                  allItems={resources.filter((r) => r.kind === "placements")}
                  resources={resources}
                  context={boot.ad_context}
                  sp={sp}
                  filters={filters}
                  clearFilters={clearFilters}
                  page={page}
                  selected={selected}
                  setSelected={setSelected}
                  canWrite={canWrite}
                  canPublish={canPublish}
                  busy={saving || uploading > 0}
                  onEdit={openEdit}
                  onPreview={preview}
                  onConfirm={setConfirmation}
                  metrics={adMetrics}
                  range={metricRange}
                  onPage={(value) => {
                    const p = new URLSearchParams(sp);
                    p.set("page", value);
                    router.push("/admin/placements?" + p);
                  }}
                />
              )}
              {videoArea && !edit && (
                <VideoLibrary
                  resources={resources}
                  sp={sp}
                  filters={filters}
                  onEdit={openEdit}
                  onPreview={preview}
                  onConfirm={setConfirmation}
                  canWrite={canWrite}
                  canPublish={canPublish}
                  busy={saving || uploading > 0}
                  onReload={load}
                />
              )}
              {fields[section] &&
                (!videoArea || edit) &&
                (section !== "placements" || edit) &&
                (edit ? (
                  <section className="panel edit-panel">
                    <div className="panel-title">
                      <div>
                        <h2>
                          {section === "settings" ? "站点配置" : "基本信息"}
                        </h2>
                        <p>草稿与线上版本独立，发布后才会更新前台。</p>
                      </div>
                      {edit.id && <Badge status={edit.status} />}
                    </div>
                    <form onSubmit={save}>
                      {section === "entries" && canWrite && (
                        <AiEntryFill
                          key={edit.id || "new"}
                          url={data.target_url || ""}
                          disabled={saving || uploading > 0}
                          onApply={(suggestions, overwrite) => {
                            setData((current) => {
                              const next = { ...current };
                              for (const [key, value] of Object.entries(
                                suggestions,
                              ))
                                if (
                                  overwrite ||
                                  !current[key] ||
                                  (Array.isArray(current[key]) &&
                                    !current[key].length)
                                )
                                  next[key] = value;
                              return next;
                            });
                            setDirty(true);
                          }}
                        />
                      )}
                      {appArea ? (
                        <AppEditor
                          fields={fields.entries}
                          renderField={field}
                          data={data}
                          errors={errors}
                          disabled={!canWrite || saving || uploading > 0}
                          onChange={(patch) => {
                            setData((current) => ({ ...current, ...patch }));
                            setDirty(true);
                          }}
                        />
                      ) : section === "settings" ? (
                        <SettingsTabs
                          fields={fields.settings}
                          renderField={field}
                          errors={errors}
                        />
                      ) : section === "placements" ? (
                        <AdEditor
                          resources={resources}
                          context={boot.ad_context}
                          key={edit.id || "new"}
                          fields={fields.placements}
                          renderField={field}
                          data={data}
                          errors={errors}
                          disabled={!canWrite || saving}
                          onBusy={onUploadBusy}
                          onChange={(patch) => {
                            setData((current) => ({ ...current, ...patch }));
                            setDirty(true);
                          }}
                        />
                      ) : (
                        <div className="form-grid">
                          {fields[section].map(field)}
                        </div>
                      )}
                      <ResourceWorkflow
                        section={section}
                        item={edit}
                        dirty={dirty}
                        busy={saving || uploading > 0}
                        canWrite={canWrite}
                        canPublish={canPublish}
                        revisions={revisions}
                        onPreview={() => preview(edit)}
                        onSubmit={() => action(edit, "submit")}
                        onConfirm={setConfirmation}
                      />
                    </form>
                  </section>
                ) : (
                  <section className="panel resource-panel">
                    <form
                      className="list-toolbar"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        filters({
                          q: f.get("q"),
                          ...(section === "contents"
                            ? {
                                updated_start: f.get("updated_start"),
                                updated_end: f.get("updated_end"),
                              }
                            : {}),
                        });
                      }}
                    >
                      <div className="list-search">
                        <Icon name="search" size={17} />
                        <input
                          name="q"
                          aria-label="搜索资源"
                          placeholder="搜索名称、标识…"
                          defaultValue={query}
                          key={query}
                        />
                      </div>
                      <select
                        aria-label="状态筛选"
                        value={status}
                        onChange={(e) => filters({ status: e.target.value })}
                      >
                        <option value="">全部状态</option>
                        {Object.entries(statuses).map(([s, t]) => (
                          <option key={s} value={s}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {section === "placements" && (
                        <>
                          <select
                            aria-label="广告类型筛选"
                            value={sp.get("ad_type") || ""}
                            onChange={(e) =>
                              filters({ ad_type: e.target.value })
                            }
                          >
                            <option value="">全部广告类型</option>
                            <option value="internal">内部推广</option>
                            <option value="external">外部合作广告</option>
                          </select>
                          <select
                            aria-label="广告配置设备范围"
                            value={sp.get("ad_device") || ""}
                            onChange={(e) =>
                              filters({ ad_device: e.target.value })
                            }
                          >
                            <option value="">不限设备配置</option>
                            <option value="all">双端配置（PC与H5）</option>
                            <option value="pc">仅桌面端配置</option>
                            <option value="h5">仅移动端配置</option>
                          </select>
                        </>
                      )}
                      {["entries", "contents"].includes(section) && (
                        <select
                          aria-label="渠道筛选"
                          value={company}
                          onChange={(e) =>
                            filters({ company_id: e.target.value })
                          }
                        >
                          <option value="">全部渠道</option>
                          {resources
                            .filter((r) => r.kind === "companies")
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                        </select>
                      )}
                      {["entries", "contents"].includes(section) && (
                        <select
                          aria-label="分类筛选"
                          value={category}
                          onChange={(e) =>
                            filters({ category_id: e.target.value })
                          }
                        >
                          <option value="">全部分类</option>
                          {resources
                            .filter((r) => r.kind === "categories")
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                        </select>
                      )}
                      {section === "contents" && (
                        <select
                          aria-label="内容来源"
                          value={source}
                          onChange={(e) =>
                            filters({ source_system: e.target.value })
                          }
                        >
                          <option value="">全部来源</option>
                          {[
                            ...new Set(
                              resources
                                .filter(
                                  (r) =>
                                    r.kind === "contents" && r.source_system,
                                )
                                .map((r) => r.source_system),
                            ),
                          ]
                            .sort()
                            .map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                        </select>
                      )}
                      {section === "contents" && (
                        <select
                          aria-label="内容类型"
                          value={type}
                          onChange={(e) => filters({ type: e.target.value })}
                        >
                          <option value="">全部类型</option>
                          <option value="video">视频</option>
                          <option value="comic">漫画</option>
                        </select>
                      )}
                      {section === "contents" && (
                        <>
                          <select
                            aria-label="资料完整性"
                            value={completeness}
                            onChange={(e) =>
                              filters({ completeness: e.target.value })
                            }
                          >
                            <option value="">全部资料</option>
                            <option value="incomplete">待补资料</option>
                            <option value="complete">资料齐全</option>
                          </select>
                          <label className="content-date-filter">
                            更新开始
                            <input
                              type="date"
                              name="updated_start"
                              defaultValue={updatedStart}
                              key={"start" + updatedStart}
                              aria-label="更新开始日期"
                            />
                          </label>
                          <label className="content-date-filter">
                            更新结束
                            <input
                              type="date"
                              name="updated_end"
                              defaultValue={updatedEnd}
                              key={"end" + updatedEnd}
                              aria-label="更新结束日期"
                            />
                          </label>
                        </>
                      )}
                      <select
                        aria-label="资源排序"
                        value={sort}
                        onChange={(e) => filters({ sort: e.target.value })}
                      >
                        <option value="order">运营排序</option>
                        <option value="updated">最近更新</option>
                        <option value="name">名称排序</option>
                      </select>
                      <button className="button" type="submit">
                        <Icon name="search" size={15} />
                        查询
                      </button>
                      {hasFilters && (
                        <button
                          className="text-button"
                          type="button"
                          onClick={clearFilters}
                        >
                          清除筛选
                        </button>
                      )}
                    </form>
                    {section === "contents" && (
                      <p className="content-filter-note">
                        按草稿检查资料；资料齐全仍需通过发布校验和媒体检查。更新时间按上海时区筛选。
                      </p>
                    )}
                    {dateError && (
                      <p
                        className="error-message content-filter-note"
                        role="alert"
                      >
                        {dateError}
                      </p>
                    )}
                    {selected.length > 0 && (
                      <div className="batch-bar">
                        已选择 {selected.length} 项
                        {(canPublish ? ["publish", "offline"] : ["submit"]).map(
                          (act) => (
                            <button
                              className="button"
                              key={act}
                              disabled={saving || uploading > 0}
                              onClick={() =>
                                setConfirmation({
                                  batch: true,
                                  action: act,
                                  title:
                                    act === "submit"
                                      ? "批量提交待发布？"
                                      : act === "publish"
                                        ? "批量发布选中资源？"
                                        : "批量下架选中资源？",
                                  text:
                                    "选中 " +
                                    selected.length +
                                    " 条资源。" +
                                    (act === "submit"
                                      ? "提交后由管理员发布，此操作不会改变前台内容。"
                                      : "每条独立校验并返回结果。"),
                                })
                              }
                            >
                              {act === "submit"
                                ? "批量提交待发布"
                                : act === "publish"
                                  ? "批量发布"
                                  : "批量下架"}
                            </button>
                          ),
                        )}
                        <button
                          className="text-button"
                          onClick={() => setSelected([])}
                        >
                          取消选择
                        </button>
                      </div>
                    )}
                    {list.length ? (
                      <div className="table-wrap">
                        <table
                          className={
                            section === "placements"
                              ? "ad-list-table"
                              : undefined
                          }
                        >
                          <thead>
                            <tr>
                              {canWrite && (
                                <th>
                                  <input
                                    type="checkbox"
                                    aria-label="全选当前页"
                                    checked={sorted
                                      .slice(
                                        (page - 1) * pageSize,
                                        page * pageSize,
                                      )
                                      .every((r) => selected.includes(r.id))}
                                    onChange={(e) =>
                                      setSelected(
                                        e.target.checked
                                          ? sorted
                                              .slice(
                                                (page - 1) * pageSize,
                                                page * pageSize,
                                              )
                                              .map((r) => r.id)
                                          : [],
                                      )
                                    }
                                  />
                                </th>
                              )}
                              <th>名称 / 标识</th>
                              <th>
                                {["entries", "contents"].includes(section)
                                  ? "所属渠道"
                                  : section === "categories"
                                    ? "分类层级 / 上级"
                                    : section === "placements"
                                      ? "展示位置"
                                      : "关联数量"}
                              </th>
                              {section === "contents" && <th>资料检查</th>}
                              {section === "placements" && (
                                <>
                                  <th>素材 / 目标 / 归属</th>
                                  <th>投放状态 / 模板</th>
                                  <th>曝光</th>
                                  <th>点击</th>
                                  <th>CTR / 报表</th>
                                </>
                              )}
                              <th>状态</th>
                              <th>线上版本</th>
                              <th>
                                {section === "contents"
                                  ? "最后更新（上海）"
                                  : "最后更新"}
                              </th>
                              <th>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sorted
                              .slice((page - 1) * pageSize, page * pageSize)
                              .map((r) => (
                                <tr key={r.id}>
                                  {canWrite && (
                                    <td>
                                      <input
                                        type="checkbox"
                                        aria-label={
                                          "选择" + (r.name || r.title)
                                        }
                                        checked={selected.includes(r.id)}
                                        onChange={(e) =>
                                          setSelected(
                                            e.target.checked
                                              ? [...selected, r.id]
                                              : selected.filter(
                                                  (x) => x !== r.id,
                                                ),
                                          )
                                        }
                                      />
                                    </td>
                                  )}
                                  <td>
                                    <strong>{r.name || r.title}</strong>
                                    {section === "categories" &&
                                      r.parent_id && (
                                        <small>
                                          {categoryPath(r.id, categories)
                                            .map((c) => c.name)
                                            .join(" / ")}
                                        </small>
                                      )}
                                    <small>
                                      {r.slug}
                                      {r.is_demo ? " · 演示数据" : ""}
                                    </small>
                                    {section === "contents" && (
                                      <small>
                                        {r.source_system || "未填来源"} ·{" "}
                                        {r.source_id || "未填来源编号"}
                                      </small>
                                    )}
                                  </td>
                                  <td>
                                    {section === "categories" ? (
                                      <>
                                        <strong>
                                          {
                                            categoryPath(r.id, categories)
                                              .length
                                          }
                                          级分类
                                        </strong>
                                        <small>
                                          {r.parent_id
                                            ? categoryPath(
                                                r.parent_id,
                                                categories,
                                              )
                                                .map((c) => c.name)
                                                .join(" / ")
                                            : "无上级"}
                                        </small>
                                      </>
                                    ) : section === "companies" ? (
                                      `${resources.filter((x) => x.company_id === r.id).length} 个入口 / 内容`
                                    ) : section === "placements" ? (
                                      locations[r.location]?.label
                                    ) : r.company_id ? (
                                      name(r.company_id)
                                    ) : section === "entries" ? (
                                      "未设置渠道"
                                    ) : r.type === "video" ? (
                                      "视频"
                                    ) : (
                                      "漫画"
                                    )}
                                  </td>
                                  {section === "contents" && (
                                    <td>
                                      {missingById.get(r.id)?.length ? (
                                        <details className="content-missing">
                                          <summary>
                                            待处理{" "}
                                            {missingById.get(r.id).length} 项
                                          </summary>
                                          <ul>
                                            {missingById
                                              .get(r.id)
                                              .map((issue) => (
                                                <li key={issue}>{issue}</li>
                                              ))}
                                          </ul>
                                        </details>
                                      ) : (
                                        <span className="badge published">
                                          资料齐全
                                        </span>
                                      )}
                                    </td>
                                  )}
                                  {section === "placements" && (
                                    <td>
                                      <AdListMaterial
                                        ad={r}
                                        context={boot.ad_context}
                                        resources={resources}
                                      />
                                    </td>
                                  )}
                                  {section === "placements" && (
                                    <td>
                                      <strong>{adState(r)}</strong>
                                      <small>
                                        {adTemplate(r) === "banner"
                                          ? "横幅"
                                          : "卡片"}{" "}
                                        ·{" "}
                                        {r.device === "all"
                                          ? "PC / H5"
                                          : r.device?.toUpperCase()}
                                      </small>
                                      <small>
                                        {r.start_at?.replace("T", " ") ||
                                          "不限开始"}{" "}
                                        →{" "}
                                        {r.end_at?.replace("T", " ") ||
                                          "不限结束"}
                                      </small>
                                    </td>
                                  )}
                                  {section === "placements" && (
                                    <AdMetricsCells
                                      state={adMetrics.state}
                                      id={r.id}
                                      range={metricRange}
                                    />
                                  )}
                                  <td>
                                    <Badge status={r.status} />
                                    {r.manual_excluded && (
                                      <small className="muted">人工排除</small>
                                    )}
                                    {r.revoked && (
                                      <span className="badge offline">
                                        已撤权
                                      </span>
                                    )}
                                  </td>
                                  <td>{r.has_published ? "已上线" : "—"}</td>
                                  <td>
                                    {section === "contents"
                                      ? updatedDisplay(r.updated_at)
                                      : r.updated_at?.slice(0, 16)}
                                  </td>
                                  <td>
                                    <div className="row-actions">
                                      {section === "categories" && canWrite && (
                                        <button
                                          className="text-button"
                                          onClick={() =>
                                            openEdit(null, { parent_id: r.id })
                                          }
                                        >
                                          添加子分类
                                        </button>
                                      )}
                                      <button
                                        className="text-button"
                                        onClick={() => openEdit(r)}
                                      >
                                        {section === "contents" &&
                                        syncedContent(r)
                                          ? "查看 / 处理"
                                          : canWrite
                                            ? "编辑"
                                            : "查看"}
                                      </button>
                                      <button
                                        className="text-button"
                                        onClick={() => preview(r)}
                                      >
                                        预览
                                      </button>
                                      {section === "placements" &&
                                        canPublish &&
                                        r.has_published && (
                                          <button
                                            className="text-button"
                                            onClick={() =>
                                              setConfirmation({
                                                item: r,
                                                action: r.published_paused
                                                  ? "resume"
                                                  : "pause",
                                                title: r.published_paused
                                                  ? "恢复此广告？"
                                                  : "暂停此广告？",
                                                text: "保留素材与历史数据。恢复时重新校验排期容量及目标有效性。",
                                              })
                                            }
                                          >
                                            {r.published_paused
                                              ? "恢复投放"
                                              : "暂停投放"}
                                          </button>
                                        )}
                                      {canPublish && !r.manual_excluded && (
                                        <button
                                          className="text-button"
                                          onClick={() =>
                                            setConfirmation({
                                              item: r,
                                              action: r.has_published
                                                ? "offline"
                                                : "publish",
                                              title: r.has_published
                                                ? "下架此资源？"
                                                : "发布此资源？",
                                              text: r.has_published
                                                ? "关联推广和前台展示将自动隐藏，历史统计保留。"
                                                : "发布前将校验必填信息、关联状态和内容授权。",
                                            })
                                          }
                                        >
                                          {r.has_published ? "下架" : "发布"}
                                        </button>
                                      )}
                                      {canWrite &&
                                        !r.has_published &&
                                        !(
                                          section === "contents" &&
                                          syncedContent(r)
                                        ) && (
                                          <button
                                            className="text-button danger"
                                            onClick={() =>
                                              setConfirmation({
                                                item: r,
                                                action: "delete",
                                                title: "删除此资源？",
                                                text: "删除后无法恢复。有其他资源引用时系统将阻止删除。",
                                              })
                                            }
                                          >
                                            删除
                                          </button>
                                        )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <Empty
                        title={
                          hasFilters
                            ? "没有符合条件的结果"
                            : "开始整理你的" + title.replace("管理", "")
                        }
                        text={
                          hasFilters
                            ? "调整筛选条件，查看其他资源。"
                            : "当前没有数据，创建后可保存草稿、预览并发布。"
                        }
                        action={
                          hasFilters ? (
                            <button className="button" onClick={clearFilters}>
                              清除筛选
                            </button>
                          ) : (
                            canWrite && (
                              <button
                                className="button"
                                onClick={() => openEdit()}
                              >
                                <Icon name="plus" size={16} />
                                创建第一条记录
                              </button>
                            )
                          )
                        }
                      />
                    )}
                    <AdminPagination
                      total={list.length}
                      page={page}
                      size={pageSize}
                      onSize={(size) => filters({ page_size: String(size) })}
                      onPage={(value) => filters({ page: String(value) })}
                    />
                  </section>
                ))}
              {section === "sync" && (
                <SourceIntegration
                  initial={extra}
                  user={user}
                  resources={resources}
                  onDirty={setDirty}
                />
              )}
              {section === "ai" && (
                <AiManagement
                  initial={extra}
                  user={user}
                  onReload={async () => {
                    const next = await api("admin/ai");
                    setExtra(next);
                    return next;
                  }}
                  onDirty={setDirty}
                />
              )}
              {section === "audit" && (
                <section className="panel">
                  <div className="panel-title">
                    <h2>最近操作</h2>
                    <span className="muted">最近 200 条 · UTC 时间</span>
                  </div>
                  {extra?.length ? (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>操作人</th>
                            <th>操作</th>
                            <th>资源编号</th>
                            <th>时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extra
                            .slice((page - 1) * pageSize, page * pageSize)
                            .map((r) => (
                              <tr key={r.id}>
                                <td>{r.actor}</td>
                                <td>{r.action}</td>
                                <td>{r.resource_id || "—"}</td>
                                <td>{r.created_at}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      title="暂无操作日志"
                      text="创建、修改与发布会自动记录在这里。"
                    />
                  )}
                  <AdminPagination
                    total={extra?.length || 0}
                    page={page}
                    size={pageSize}
                    onPage={(value) => filters({ page: String(value) })}
                    onSize={(value) => filters({ page_size: String(value) })}
                  />
                </section>
              )}
              {section === "users" && (
                <Users
                  extra={extra}
                  reload={load}
                  setError={setError}
                  me={user}
                />
              )}
              {section === "password" && <Password />}
            </>
          )}
        </main>
        <footer className="admin-footer">
          <span>精品工具导航站 · 发现更高效的工作方式</span>
          <span>TOOLS WORKSPACE</span>
        </footer>
      </div>
      {confirmation && (
        <ConfirmDialog
          busy={saving || uploading > 0}
          onDismiss={() => {
            if (!confirming.current) setConfirmation(null);
          }}
        >
          <Icon name="alert" size={30} />
          <h2 id="confirm-title">{confirmation.title}</h2>
          <p id="confirm-description">{confirmation.text}</p>
          {needsAdReason && (
            <AdActionConfirmation
              confirmation={confirmation}
              items={
                confirmation.batch
                  ? resources.filter((r) => selected.includes(r.id))
                  : [confirmation.item]
              }
              resources={resources}
              revisions={revisions}
              busy={saving}
              onReason={(reason) => setConfirmation((c) => ({ ...c, reason }))}
            />
          )}{" "}
          {needsImpact && (
            <section className="offline-impact" aria-live="polite">
              {impact?.error ? (
                <>
                  <p className="error-message">{impact.error}</p>
                  <button
                    className="text-button"
                    onClick={() => setImpactAttempt((n) => n + 1)}
                  >
                    重新读取影响范围
                  </button>
                </>
              ) : !impactReady ? (
                <p role="status">正在核对关联与前台影响…</p>
              ) : (
                <>
                  <h3>下架后前台将减少</h3>
                  <ul>
                    {Object.entries(impact.data.hidden).map(([kind, count]) => (
                      <li key={kind}>
                        {labels[kind]}
                        <strong>{count} 项</strong>
                      </li>
                    ))}
                  </ul>
                  <p>
                    直接关联（含草稿与发布版本）：
                    {Object.entries(impact.data.references)
                      .map(
                        ([kind, count]) => labels[kind] + " " + count + " 项",
                      )
                      .join("、")}
                    。
                  </p>
                  <p>
                    以上为当前展示快照；关联资料和历史统计会保留，实际提交仍检查资源版本。
                  </p>
                </>
              )}
            </section>
          )}
          <div className="form-actions">
            <button
              autoFocus
              className="button"
              disabled={saving || uploading > 0}
              onClick={() => {
                if (!confirming.current) setConfirmation(null);
              }}
            >
              取消
            </button>
            <button
              className="button primary"
              disabled={
                saving || uploading > 0 || !impactReady || !adReasonReady
              }
              onClick={async () => {
                if (
                  confirming.current ||
                  saving ||
                  uploading > 0 ||
                  !impactReady ||
                  !adReasonReady
                )
                  return;
                confirming.current = true;
                try {
                  if (confirmation.batch) {
                    setSaving(true);
                    try {
                      const r = await api("admin/" + section, {
                        action: confirmation.action,
                        batch: resources
                          .filter((r) => selected.includes(r.id))
                          .map((r) => ({
                            id: r.id,
                            version: r.version,
                            ...(needsAdReason
                              ? { reason: confirmation.reason }
                              : {}),
                          })),
                      });
                      setBatchResults(
                        r.results.map((result) => ({
                          ...result,
                          name: name(result.id),
                        })),
                      );
                      const ok = r.results.filter((r) => r.ok).length;
                      setNotice(
                        `成功 ${ok} 条，失败 ${r.results.length - ok} 条。`,
                      );
                      const failed = r.results.filter((r) => !r.ok);
                      setError("");
                      setSelected(failed.map((r) => r.id));
                      const b = await api(
                        "admin/bootstrap?include_stats=0" +
                          (section === "placements"
                            ? "&include_ad_context=1"
                            : ""),
                      );
                      setBoot(b);
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setSaving(false);
                      setConfirmation(null);
                    }
                  } else
                    await action(confirmation.item, confirmation.action, {
                      ...confirmation.more,
                      ...(needsAdReason ? { reason: confirmation.reason } : {}),
                    });
                } finally {
                  confirming.current = false;
                }
              }}
            >
              {saving ? "正在处理…" : "确认操作"}
            </button>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
function ReportFilters({ sp, filters, resources, canDebug }) {
  return (
    <form
      className="report-filters"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        filters(Object.fromEntries(f));
      }}
    >
      <div className="range-chips">
        {[
          ["today", "今天"],
          ["yesterday", "昨天"],
          ["7", "近 7 天"],
          ["30", "近 30 天"],
        ].map(([v, t]) => (
          <button
            key={v}
            type="button"
            className={
              (sp.get("range") || "7") === v && !sp.get("start")
                ? "selected"
                : ""
            }
            onClick={() => filters({ range: v, start: "", end: "" })}
          >
            {t}
          </button>
        ))}
      </div>
      <label>
        <span>开始日期</span>
        <input
          type="date"
          name="start"
          defaultValue={sp.get("start") || ""}
          key={"start" + sp}
        />
      </label>
      <label>
        <span>结束日期</span>
        <input
          type="date"
          name="end"
          defaultValue={sp.get("end") || ""}
          key={"end" + sp}
        />
      </label>
      <select
        name="company_id"
        aria-label="归属渠道"
        defaultValue={sp.get("company_id") || ""}
        key={"company" + sp}
      >
        <option value="">全部渠道</option>
        <option value="unassigned">未归属</option>
        {resources
          .filter((x) => x.kind === "companies")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <select
        name="device"
        aria-label="设备"
        defaultValue={sp.get("device") || ""}
        key={"device" + sp}
      >
        <option value="">全部设备</option>
        <option value="pc">PC</option>
        <option value="h5">H5</option>
      </select>
      <select
        name="os"
        aria-label="设备系统"
        defaultValue={sp.get("os") || ""}
        key={"os" + sp}
      >
        <option value="">全部系统</option>
        <option value="android">Android</option>
        <option value="ios">iOS / iPadOS</option>
        <option value="desktop">桌面</option>
        <option value="unknown">未识别</option>
      </select>
      <select
        name="ad_type"
        aria-label="广告类型"
        defaultValue={sp.get("ad_type") || ""}
        key={"adtype" + sp}
      >
        <option value="">全部广告类型</option>
        <option value="internal">内部推广</option>
        <option value="external">外部合作</option>
      </select>
      <input
        name="slot_id"
        aria-label="广告位置编号"
        placeholder="广告位置编号"
        defaultValue={sp.get("slot_id") || ""}
        key={"slot" + sp}
      />
      <input
        name="creative_version"
        type="number"
        min="1"
        aria-label="素材版本"
        placeholder="素材版本"
        defaultValue={sp.get("creative_version") || ""}
        key={"creative" + sp}
      />
      <select
        name="placement_id"
        aria-label="来源位置"
        defaultValue={sp.get("placement_id") || ""}
        key={"placement" + sp}
      >
        <option value="">全部位置</option>
        <option value="navigation">普通导航</option>
        {resources
          .filter((x) => x.kind === "placements")
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
      {canDebug && (
        <select
          name="traffic"
          aria-label="流量范围"
          defaultValue={sp.get("traffic") || "live"}
          key={"traffic" + sp}
        >
          <option value="live">业务流量（默认）</option>
          <option value="test">仅测试与机器人</option>
          <option value="all">全部记录（排查）</option>
        </select>
      )}
      <select
        name="resource_mode"
        aria-label="资源性质"
        defaultValue={sp.get("resource_mode") || "all"}
        key={"resource-mode" + sp}
      >
        <option value="all">全部资源性质</option>
        <option value="real">非演示资源</option>
        <option value="demo">演示资源</option>
        <option value="none">无关联资源事件</option>
        <option value="unknown">历史性质未知</option>
      </select>
      <input
        name="channel"
        aria-label="来源渠道码"
        placeholder="来源渠道码"
        defaultValue={sp.get("channel") || ""}
        key={"channel" + sp}
      />
      <button className="button">筛选</button>
    </form>
  );
}
function Users({ extra, reload, setError, me }) {
  const [busy, setBusy] = useState(false),
    [size, setSize] = useState(20),
    [requested, setRequested] = useState(1);
  const members = Array.isArray(extra) ? extra : [],
    page = Math.min(requested, Math.max(1, Math.ceil(members.length / size)));
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <h2>创建后台账号</h2>
        </div>
        <form
          className="user-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const f = e.currentTarget;
            try {
              await api("admin/users", Object.fromEntries(new FormData(f)));
              f.reset();
              await reload();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            账号
            <input name="username" required minLength={3} />
          </label>
          <label>
            姓名
            <input name="name" required />
          </label>
          <label>
            初始密码
            <input
              name="password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
            />
          </label>
          <label>
            角色
            <select name="role">
              {Object.entries(roleNames).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <button className="button primary" disabled={busy}>
            创建账号
          </button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-title">
          <h2>后台成员</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>账号</th>
                <th>姓名</th>
                <th>角色</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.slice((page - 1) * size, page * size).map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.name}</td>
                  <td>{roleNames[u.role]}</td>
                  <td>{u.enabled ? "正常" : "停用"}</td>
                  <td>
                    {u.id === me.id ? (
                      "当前账号"
                    ) : (
                      <button
                        className="text-button"
                        onClick={async () => {
                          if (
                            !confirm(
                              u.enabled
                                ? "停用此账号并撤销全部会话？"
                                : "重新启用此账号？",
                            )
                          )
                            return;
                          try {
                            await api("admin/users", {
                              ...u,
                              enabled: !u.enabled,
                            });
                            reload();
                          } catch (e) {
                            setError(e.message);
                          }
                        }}
                      >
                        {u.enabled ? "停用" : "启用"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination
          total={members.length}
          page={page}
          size={size}
          onPage={setRequested}
          onSize={(n) => {
            setSize(n);
            setRequested(1);
          }}
        />
      </section>
    </>
  );
}
function Password() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel narrow-panel">
      <div className="panel-title">
        <h2>修改登录密码</h2>
      </div>
      <form
        className="password-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const d = Object.fromEntries(new FormData(e.currentTarget));
          if (d.password !== d.confirm) {
            setError("两次输入的新密码不一致");
            setBusy(false);
            return;
          }
          try {
            await api("auth/password", d);
            location.href = "/admin/login";
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          当前密码
          <input
            name="current"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        <label>
          新密码
          <input
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            required
            autoComplete="new-password"
          />
        </label>
        <label>
          确认新密码
          <input
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
          />
        </label>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "保存中…" : "保存并重新登录"}
        </button>
        <p className="muted">修改后将撤销此账号的全部登录会话。</p>
      </form>
    </section>
  );
}
