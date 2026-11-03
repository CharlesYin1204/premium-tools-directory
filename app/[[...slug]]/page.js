import PublicFooter from "../../components/public-footer";
import { homeModules } from "../../lib/home-modules";
import EntryLanding from "../../components/entry-landing";
import { landingEnabled, visitPath } from "../../lib/entry-landing";
import {
  HomeSearchProvider,
  HomeSearchResults,
} from "../../components/home-search";
import { PortalSidebar, BackToTop } from "../../components/portal-home";
import { portalConfig } from "../../lib/portal-config";
import { recommendationTokens } from "../../lib/recommendation-context";
import HomeIntro from "../../components/home-intro";
import SupportWidget from "../../components/support-widget";
import VideoDetail from "../../components/video-detail";
import { copy, siteConfig } from "../../lib/site-config";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getPublic } from "../../lib/resources";
import {
  Nav,
  SearchBox,
  Picture,
  EntryLink,
  Video,
  Reader,
  Tracker,
} from "../../components/public-client";
import Icon from "../../components/icons";
import SiteMark from "../../components/site-mark";
import DirectoryIndex from "../../components/directory-index";
import {
  HomeModules,
  EntryCard,
  ContentCard,
  Heading,
  Promotions,
} from "../../components/home-modules";
import { publishedDate, contentFilterOptions } from "../../lib/public-content";
import {
  categoryEntries,
  categoryNavigation,
} from "../../lib/category-navigation";
import {
  pagination,
  paginationUrl,
  PUBLIC_PAGE_SIZE,
  contentPageSize,
  HOME_CATEGORY_LIMIT,
  pageNumbers,
} from "../../lib/pagination";
import { toolSearchAvailable } from "../../lib/ai";
import AiMovieSearch from "../../components/ai-movie-search";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) {
  const { slug = [] } = await params;
  const d = await getPublic();
  let title = d.site.name;
  const titles = {
    categories: "分类导航",
    search: "搜索发现",
    "ai-search": "AI 工具推荐",
    videos: "精选视频",
    comics: "漫画阅读",
    about: "关于我们",
    privacy: "隐私说明",
    copyright: "版权与反馈",
  };
  if (titles[slug[0]])
    title =
      [...(d.site.navigation || []), ...(d.site.footer_navigation || [])].find(
        (item) => item.href === "/" + slug.join("/"),
      )?.label || titles[slug[0]];
  const item =
    slug[0] === "site"
      ? d.entries.find((e) => e.slug === slug[1])
      : slug[0] === "category"
        ? d.categories.find((x) => x.slug === slug[1])
        : ["video", "comic"].includes(slug[0])
          ? d.contents.find((x) => x.slug === slug[1])
          : null;
  if (item) title = item.name || item.title;
  return {
    title: {
      absolute: slug.length
        ? `${title} · ${d.site.name}`
        : d.site.seo_title || d.site.name,
    },
    description: item?.description || item?.summary || d.site.seo_description,
    alternates: { canonical: process.env.PUBLIC_URL + "/" + slug.join("/") },
    robots: ["site", "search", "ai-search"].includes(slug[0])
      ? { index: false, follow: true }
      : undefined,
  };
}
function Empty({
  title = "好内容，正在准备中",
  text = "我们正在认真整理每一个值得发现的入口。稍后回来，探索更多可能。",
  icon = "compass",
}) {
  return (
    <div className="empty public-empty">
      <span className="empty-orbit">
        <Icon name={icon} size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      <Link href="/" className="text-link">
        返回发现首页
        <Icon name="arrow" size={16} />
      </Link>
    </div>
  );
}
function Pages({ total, params, pageKey = "page", size = PUBLIC_PAGE_SIZE }) {
  const { page, pages } = pagination(
    total,
    params[pageKey] ?? params.page,
    size,
  );
  if (total <= size) return null;
  return (
    <nav className="pagination" aria-label="结果分页">
      {page > 1 && (
        <Link
          className="button"
          href={paginationUrl(params, pageKey, page - 1)}
        >
          上一页
        </Link>
      )}
      <div className="page-numbers">
        {pageNumbers(page, pages).map((n) =>
          typeof n === "string" ? (
            <span key={n} aria-hidden="true">
              …
            </span>
          ) : n === page ? (
            <span
              key={n}
              className="page-number current"
              aria-current="page"
              aria-label={`第 ${n} 页，当前页`}
            >
              {n}
            </span>
          ) : (
            <Link
              key={n}
              className="page-number"
              href={paginationUrl(params, pageKey, n)}
              aria-label={`第 ${n} 页`}
            >
              {n}
            </Link>
          ),
        )}
      </div>
      {page < pages && (
        <Link
          className="button"
          href={paginationUrl(params, pageKey, page + 1)}
        >
          下一页
        </Link>
      )}
      <span className="pagination-summary">
        第 {page} / {pages} 页 · 共 {total} 项 · 每页 {size} 项
      </span>
    </nav>
  );
}
export default async function Page({ params, searchParams }) {
  const { slug = [] } = await params;
  const sp = await searchParams;
  const data = await getPublic(),
    site = data.site;
  const section = slug[0] || "home";
  if (
    section !== "ai-search" &&
    (![
      "site",
      "home",
      "categories",
      "category",
      "search",
      "videos",
      "comics",
      "video",
      "comic",
      "about",
      "privacy",
      "copyright",
    ].includes(section) ||
      slug.length > 2)
  )
    notFound();
  const slice = (items, key = "page") => {
    const { start, end } = pagination(items.length, sp[key] ?? sp.page);
    return items.slice(start, end);
  };
  let content = null,
    detailId;
  if (section === "site") {
    const entry = data.entries.find((e) => e.slug === slug[1]);
    if (!entry) notFound();
    const q = new URLSearchParams(
      Object.entries(sp).filter(([, v]) => typeof v === "string"),
    );
    if (!landingEnabled(site, entry) && !Object.hasOwn(sp, "preview"))
      redirect(visitPath(entry, q));
    content = <EntryLanding entry={entry} data={data} params={q} />;
  }
  if (section === "home")
    content = (
      <>
        <HomeIntro data={data} />
        <HomeSearchResults />
        <HomeModules data={data} />
      </>
    );
  if (section === "ai-search") {
    const ai = await toolSearchAvailable();
    content = (
      <>
        <h1 className="sr-only">AI 工具推荐</h1>
        <AiMovieSearch config={ai} />
      </>
    );
  }
  if (section === "categories" || section === "category") {
    const category =
      section === "category"
        ? data.categories.find((c) => c.slug === slug[1])
        : null;
    if (section === "category" && !category) notFound();
    const allEntries = categoryEntries(category, data.entries, data.categories);
    const tag = typeof sp.tag === "string" ? sp.tag : "";
    const list = tag
      ? allEntries.filter((e) => e.tags?.includes(tag))
      : allEntries;
    const tags = [...new Set(allEntries.flatMap((e) => e.tags || []))];
    const navigation = categoryNavigation(
      category,
      data.entries,
      data.categories,
    );
    content = (
      <>
        <nav className="breadcrumb category-breadcrumb" aria-label="分类路径">
          <Link href="/">发现</Link>
          <Icon name="right" size={14} />
          {category ? (
            <Link href="/categories">分类导航</Link>
          ) : (
            <span aria-current="page">分类导航</span>
          )}
          {navigation.ancestors.map((parent) => (
            <span className="category-ancestor" key={parent.id}>
              <Icon name="right" size={14} />
              <Link href={"/category/" + parent.slug}>{parent.name}</Link>
            </span>
          ))}
          {category && (
            <>
              <Icon name="right" size={14} />
              <span aria-current="page">{category.name}</span>
            </>
          )}
        </nav>
        <h1 className="sr-only">
          {category?.name || copy(site, "directory_title")}
        </h1>
        <nav className="chips" aria-label="一级分类">
          <Link
            href="/categories"
            className={!category ? "selected" : ""}
            aria-current={!category ? "page" : undefined}
          >
            全部入口 <span>{data.entries.length}</span>
          </Link>
          {navigation.roots.map((c) => (
            <Link
              className={navigation.root?.id === c.id ? "selected" : ""}
              aria-current={
                navigation.root?.id === c.id ? "location" : undefined
              }
              key={c.id}
              href={"/category/" + c.slug}
            >
              {c.name}
            </Link>
          ))}
        </nav>
        {navigation.branches.map(({ owner, children }, index) => (
          <nav
            className="chips subcategory-chips"
            aria-label={index === 0 ? "子分类" : `${index + 2}级分类`}
            key={owner.id}
          >
            <Link
              href={"/category/" + owner.slug}
              className={category.id === owner.id ? "selected" : ""}
            >
              全部{owner.name}
            </Link>
            {children.map((c) => (
              <Link
                key={c.id}
                href={"/category/" + c.slug}
                className={
                  category.id === c.id ||
                  navigation.ancestors.some((a) => a.id === c.id)
                    ? "selected"
                    : ""
                }
                aria-current={category.id === c.id ? "page" : undefined}
              >
                {c.name}
                <span>
                  {categoryEntries(c, data.entries, data.categories).length}
                </span>
              </Link>
            ))}
          </nav>
        ))}
        {category && (
          <Promotions
            data={data}
            location="category"
            categoryId={category.id}
          />
        )}
        {tags.length > 0 && (
          <nav className="chips category-tag-chips" aria-label="入口标签">
            <Link
              href={category ? "/category/" + category.slug : "/categories"}
              className={!tag ? "selected" : ""}
            >
              全部标签
            </Link>
            {tags.map((t) => (
              <Link
                key={t}
                href={"?" + new URLSearchParams({ tag: t })}
                className={tag === t ? "selected" : ""}
              >
                {t}
              </Link>
            ))}
          </nav>
        )}
        <div className="results-meta">
          <span>
            共 {list.length} 个入口 · 当前显示{" "}
            {list.length ? pagination(list.length, sp.page).start + 1 : 0}–
            {Math.min(pagination(list.length, sp.page).end, list.length)} 个
          </span>
          <span>按运营精选排序</span>
        </div>
        {list.length ? (
          <div className="entry-grid">
            {slice(list).map((e) => (
              <EntryCard key={e.id} entry={e} data={data} />
            ))}
          </div>
        ) : (
          <Empty
            title={tag ? "没有符合标签的入口" : "这里正在等待新的发现"}
            text={
              tag
                ? "请选择其他标签，或点击全部标签查看该分类。"
                : "目前还没有已发布的站点入口。"
            }
          />
        )}
        <Pages total={list.length} params={sp} />
      </>
    );
  }
  if (section === "search" && sp.mode === "ai")
    redirect(
      "/?" +
        new URLSearchParams({
          mode: "ai",
          q: typeof sp.q === "string" ? sp.q : "",
        }),
    );
  if (section === "search") {
    const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 50) : "";
    const rank = (item) => {
      const name = (item.name || item.title || "").toLowerCase(),
        needle = q.toLowerCase();
      return name === needle ? 0 : name.startsWith(needle) ? 1 : 2;
    };
    const match = (x) =>
      q &&
      [
        x.name,
        x.title,
        x.description,
        x.summary,
        ...(x.tags || []),
        ...(x.aliases || []),
        data.companies.find((c) => c.id === x.company_id)?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase());
    const groups = [
      ["entries", "站点入口", data.entries.filter(match)],
      [
        "video",
        "视频",
        data.contents.filter((c) => c.type === "video" && match(c)),
      ],
      [
        "comic",
        "漫画",
        data.contents.filter((c) => c.type === "comic" && match(c)),
      ],
    ];
    const total = groups.reduce((s, g) => s + g[2].length, 0);
    const selectedType = ["entries", "video", "comic"].includes(sp.type)
      ? sp.type
      : "all";
    const visibleGroups = groups.filter(
      ([key]) => selectedType === "all" || key === selectedType,
    );
    const visibleTotal = visibleGroups.reduce((sum, g) => sum + g[2].length, 0);
    content = (
      <>
        <div className="page-intro">
          <span className="eyebrow">SEARCH & DISCOVER</span>
          <h1>{copy(site, "search_title")}</h1>
          <SearchBox value={q} site={site} />
        </div>
        {q ? (
          <>
            <div className="chips">
              {[
                ["all", "全部", total],
                ...groups.map(([k, t, a]) => [k, t, a.length]),
              ].map(([key, label, n]) => (
                <Link
                  key={key}
                  className={selectedType === key ? "selected" : ""}
                  href={"?" + new URLSearchParams({ q, type: key })}
                >
                  {label} <span>{n}</span>
                </Link>
              ))}
            </div>
            <p className="muted">“{q}” 的搜索结果</p>
            {visibleTotal ? (
              visibleGroups.map(
                ([key, title, items]) =>
                  items.length > 0 && (
                    <section className="section" key={key}>
                      <Heading title={title} />
                      <div
                        className={
                          key === "entries" ? "entry-grid" : "content-grid"
                        }
                      >
                        {slice(
                          items.sort((a, b) => rank(a) - rank(b)),
                          "page_" + key,
                        ).map((x) =>
                          key === "entries" ? (
                            <EntryCard key={x.id} entry={x} data={data} />
                          ) : (
                            <ContentCard key={x.id} item={x} data={data} />
                          ),
                        )}
                      </div>
                      <Pages
                        total={items.length}
                        params={sp}
                        pageKey={"page_" + key}
                      />
                    </section>
                  ),
              )
            ) : (
              <Empty
                title="没有找到相关内容"
                text="试试更短的关键词，或换一种表达方式。"
                icon="search"
              />
            )}
          </>
        ) : (
          <Empty
            title="从一个关键词开始"
            text="可以搜索产品名称、公司、标签或内容标题。"
            icon="search"
          />
        )}
      </>
    );
  }
  if (section === "videos" || section === "comics") {
    const type = section === "videos" ? "video" : "comic",
      pageSize = contentPageSize(sp.page_size);
    const options = contentFilterOptions(data.contents, data.categories, type);
    const hasFilters = !!(sp.category || sp.tag);
    let list = data.contents.filter(
      (c) =>
        c.type === type &&
        (!sp.category || c.category_ids.includes(sp.category)) &&
        (!sp.tag || c.tags?.includes(sp.tag)),
    );
    if (sp.sort === "new")
      list = list.sort(
        (a, b) =>
          String(b.published_at).localeCompare(String(a.published_at)) ||
          a.id.localeCompare(b.id),
      );
    content = (
      <>
        <h1 className="sr-only">
          {type === "video" ? "精选视频" : "漫画阅读"}
        </h1>
        <form
          className="filter-bar"
          key={JSON.stringify([sp.category, sp.tag, sp.sort, pageSize])}
        >
          <label>
            <span className="sr-only">分类</span>
            <select
              aria-label="分类"
              name="category"
              defaultValue={sp.category || ""}
            >
              <option value="">全部分类</option>
              {sp.category &&
                !options.categories.some((c) => c.id === sp.category) && (
                  <option value={sp.category}>当前分类暂无内容</option>
                )}
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">标签</span>
            <select aria-label="标签" name="tag" defaultValue={sp.tag || ""}>
              <option value="">全部标签</option>
              {sp.tag && !options.tags.includes(sp.tag) && (
                <option value={sp.tag}>{sp.tag}</option>
              )}
              {options.tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">排序</span>
            <select aria-label="排序" name="sort" defaultValue={sp.sort || ""}>
              <option value="">编辑精选</option>
              <option value="new">最近更新</option>
            </select>
          </label>
          <label>
            <span className="sr-only">每页数量</span>
            <select
              name="page_size"
              aria-label="每页数量"
              defaultValue={pageSize}
            >
              {[12, 24, 48].map((n) => (
                <option key={n} value={n}>
                  每页 {n} 条
                </option>
              ))}
            </select>
          </label>
          <button className="button">应用筛选</button>
          {hasFilters && (
            <Link className="text-link" href={"/" + section}>
              清除筛选
            </Link>
          )}
        </form>
        <p className="results-meta">
          共 {list.length} 部{type === "video" ? "视频" : "漫画"}
        </p>
        {list.length ? (
          <div className="content-grid">
            {list
              .slice(
                pagination(list.length, sp.page, pageSize).start,
                pagination(list.length, sp.page, pageSize).end,
              )
              .map((c) => (
                <ContentCard key={c.id} item={c} data={data} />
              ))}
          </div>
        ) : (
          <Empty
            title={
              hasFilters
                ? "没有符合筛选的内容"
                : type === "video"
                  ? "精彩内容，值得等待"
                  : "新的故事，正在准备"
            }
            text={
              hasFilters
                ? "试试其他分类或标签，或清除筛选查看全部内容。"
                : "当前暂无已发布内容，请稍后再来。"
            }
            icon={type === "video" ? "play" : "book"}
          />
        )}
        <Pages total={list.length} params={sp} size={pageSize} />
      </>
    );
  }
  if (section === "video" || section === "comic") {
    const c = data.contents.find(
      (x) => x.slug === slug[1] && x.type === section,
    );
    if (!c) notFound();
    detailId = c.id;
    const recommendationAt = Date.now();
    content =
      section === "video" ? (
        <VideoDetail
          content={c}
          data={data}
          recommendationAt={recommendationAt}
          recommendationTokens={
            Object.hasOwn(sp, "preview")
              ? {}
              : recommendationTokens(c, data, recommendationAt)
          }
        />
      ) : (
        <>
          <div className="breadcrumb">
            <Link href="/">发现</Link>
            <Icon name="right" size={14} />
            <Link href={section === "video" ? "/videos" : "/comics"}>
              {section === "video" ? "精选视频" : "漫画阅读"}
            </Link>
            <Icon name="right" size={14} />
            {c.title}
          </div>
          <div className="detail-heading" id="content-details" tabIndex={-1}>
            <span className="eyebrow">{c.brand}</span>
            <h1>{c.title}</h1>
            <p>
              {data.companies.find((x) => x.id === c.company_id)?.name} ·{" "}
              {c.source_system || "运营精选"}
            </p>
          </div>
          {section === "video" ? (
            <Video content={c} seconds={site.video_seconds} />
          ) : (
            <Reader content={c} />
          )}
          <section className="section description">
            <h2>内容简介</h2>
            <p>{c.summary}</p>
            <div className="tags">
              {c.tags?.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <small>品牌归属：{c.brand} · 内容经授权展示</small>
          </section>
          {c.entry_ids?.some((id) => data.entries.some((e) => e.id === id)) && (
            <section className="section">
              <Heading title="探索相关产品" />
              <div className="entry-grid">
                {data.entries
                  .filter((e) => c.entry_ids.includes(e.id))
                  .map((e) => (
                    <EntryCard
                      key={e.id}
                      entry={e}
                      data={data}
                      contentId={c.id}
                    />
                  ))}
              </div>
            </section>
          )}
          <Promotions data={data} location="detail" contentId={c.id} />
        </>
      );
  }
  if (["about", "privacy", "copyright"].includes(section))
    content = (
      <article className="prose page-intro">
        <span className="eyebrow">{copy(site, "about_kicker")}</span>
        <h1>
          {section === "about"
            ? copy(site, "about_title")
            : section === "privacy"
              ? "隐私说明"
              : "版权与反馈"}
        </h1>
        <p>
          {section === "about"
            ? site.hero_subtitle
            : section === "privacy"
              ? site.privacy
              : site.rights_policy}
        </p>
        {site.contact_email && (
          <a className="text-link" href={"mailto:" + site.contact_email}>
            {site.contact_email}
          </a>
        )}
      </article>
    );
  return (
    <HomeSearchProvider data={section === "home" ? data : null}>
      <div
        data-portal-theme={portalConfig(site.portal).theme}
        className={
          "public-site onenav-site " +
          (portalConfig(site.portal).sidebar ? "has-portal-sidebar " : "") +
          "page-" +
          section
        }
      >
        <a href="#main" className="skip-link">
          跳转至正文
        </a>
        <PortalSidebar
          site={site}
          categories={
            homeModules(site.home_modules).some(
              (m) => m.id === "directory" && m.enabled,
            )
              ? data.categories.filter(
                  (c) =>
                    c.show_empty ||
                    categoryEntries(c, data.entries, data.categories).length,
                )
              : []
          }
        />
        <Nav site={site} />
        <BackToTop />
        <main className="public-main" id="main">
          {content}
        </main>
        <SupportWidget site={site} />
        <PublicFooter site={site} home={section === "home"} />
        <Suspense>
          <Tracker contentId={detailId} enabled={site.analytics_enabled} />
        </Suspense>
      </div>
    </HomeSearchProvider>
  );
}
