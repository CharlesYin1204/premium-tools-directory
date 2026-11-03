import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { query, transaction, pool, decode } from "../lib/db.js";

const apply = process.argv.includes("--apply");
const manifest = JSON.parse(
  await readFile(
    new URL("../data/general-tools.json", import.meta.url),
    "utf8",
  ),
);
const stable = (kind, slug) =>
  "tool-" +
  createHash("sha256")
    .update("premium-general-tools:" + kind + ":" + slug)
    .digest("hex")
    .slice(0, 30);
const actor = "user-authorized-general-tools-migration";
const iconPath = (slug) => "/media/general-tools/" + slug + ".webp";

try {
  const before = await query("SELECT * FROM resources ORDER BY id");
  const backup = `storage/backups/before-general-tools-${Date.now()}.json`;
  const retiredRows = before.filter((row) => row.kind === "contents");
  if (apply) {
    await mkdir("storage/backups", { recursive: true });
    await writeFile(backup, JSON.stringify(before, null, 2), { mode: 0o600 });
    await mkdir("public/media/general-tools", { recursive: true });
  }
  for (const entry of manifest.entries) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="28" fill="${entry.color}"/><circle cx="108" cy="16" r="48" fill="white" opacity=".13"/><text x="64" y="77" text-anchor="middle" font-family="sans-serif" font-size="${entry.mark.length > 2 ? 27 : 42}" font-weight="700" fill="white">${entry.mark}</text></svg>`;
    if (apply)
      await sharp(Buffer.from(svg))
        .webp({ quality: 90 })
        .toFile("public" + iconPath(entry.slug));
  }
  const result = await transaction(async (db) => {
    await query("SELECT id FROM resources WHERE id='site' FOR UPDATE", [], db);
    const rows = await query("SELECT * FROM resources FOR UPDATE", [], db);
    const publish = async (id, kind, data, existing) => {
      if (!apply) return;
      const payload = JSON.stringify(data),
        version = (existing?.version || 0) + 1;
      if (existing)
        await query(
          "UPDATE resources SET slug=?,draft=?,published=?,status='published',version=?,published_at=UTC_TIMESTAMP(3),is_demo=0,revoked=0,manual_excluded=0 WHERE id=?",
          [data.slug, payload, payload, version, id],
          db,
        );
      else
        await query(
          "INSERT INTO resources(id,kind,slug,draft,published,status,version,published_at,is_demo) VALUES(?,?,?,?,?,'published',1,UTC_TIMESTAMP(3),0)",
          [id, kind, data.slug, payload, payload],
          db,
        );
      await query(
        "INSERT INTO revisions(resource_id,version,payload,actor) VALUES(?,?,?,?)",
        [id, version, payload, actor],
        db,
      );
    };
    const companyId = stable("companies", "general-tools");
    const oldCompany = rows.find((r) => r.id === companyId);
    await publish(
      companyId,
      "companies",
      {
        slug: "general-tools",
        name: "通用工具",
        description: "经过人工整理的日常办公、学习、设计和开发工具。",
        logo_url: "",
        sort_order: 1,
      },
      oldCompany,
    );
    const categoryIds = {};
    for (const [index, category] of manifest.categories.entries()) {
      const existing = rows.find(
          (r) => r.kind === "categories" && r.slug === category.slug,
        ),
        id = existing?.id || stable("categories", category.slug);
      categoryIds[category.slug] = id;
      await publish(
        id,
        "categories",
        { ...category, parent_id: "", sort_order: 10 + index },
        existing,
      );
    }
    for (const [index, entry] of manifest.entries.entries()) {
      const existing = rows.find(
          (r) =>
            r.kind === "entries" &&
            (r.slug === entry.slug ||
              decode(r.published)?.target_url === entry.url ||
              decode(r.draft)?.target_url === entry.url),
        ),
        id = existing?.id || stable("entries", entry.slug);
      await publish(
        id,
        "entries",
        {
          slug: entry.slug,
          name: entry.name,
          description: entry.description,
          target_url: entry.url,
          backup_url: "",
          target_type: "website",
          action_mode: "visit",
          android_url: "",
          ios_url: "",
          company_id: companyId,
          category_ids: [categoryIds[entry.category]],
          tags: entry.tags,
          aliases: [],
          icon_url: iconPath(entry.slug),
          channel_code: "",
          sort_order: 10 + index,
          source_system: "premium-general-tools",
          source_id: entry.slug,
        },
        existing,
      );
    }
    if (apply)
      for (const row of retiredRows)
        await query(
          "UPDATE resources SET published=NULL,status='offline',manual_excluded=1,version=version+1 WHERE id=?",
          [row.id],
          db,
        );
    const site = rows.find((r) => r.id === "site");
    if (apply && site?.published) {
      const patch = (value) => {
        const data = decode(value);
        return {
          ...data,
          name: "精品工具导航站",
          navigation: [
            { href: "/", label: "发现", icon: "compass", enabled: true },
            {
              href: "/categories",
              label: "分类导航",
              icon: "grid",
              enabled: true,
            },
            {
              href: "/ai-search",
              label: "AI 工具推荐",
              icon: "search",
              enabled: true,
            },
          ],
          seo_description:
            "精品工具导航站收录常用 AI、设计、开发、办公和效率工具，帮助用户快速找到可靠的通用工具。",
        };
      };
      const draft = patch(site.draft),
        published = patch(site.published),
        version = site.version + 1;
      await query(
        "UPDATE resources SET draft=?,published=?,version=?,published_at=UTC_TIMESTAMP(3) WHERE id=?",
        [JSON.stringify(draft), JSON.stringify(published), version, site.id],
        db,
      );
      await query(
        "INSERT INTO revisions(resource_id,version,payload,actor) VALUES(?,?,?,?)",
        [site.id, version, JSON.stringify(published), actor],
        db,
      );
    }
    if (apply)
      await query(
        "INSERT INTO audit(actor,action,resource_id,detail) VALUES(?,?,?,?)",
        [
          actor,
          "setup_general_tools",
          null,
          JSON.stringify({
            archived: retiredRows.length,
            entries: manifest.entries.length,
            categories: manifest.categories.length,
            backup,
          }),
        ],
        db,
      );
    return {
      applied: apply,
      backup,
      retired_resources: retiredRows.length,
      entries: manifest.entries.length,
      categories: manifest.categories.length,
    };
  });
  if (apply) {
    await mkdir("artifacts", { recursive: true });
    await writeFile(
      "artifacts/general-tools-migration.json",
      JSON.stringify(result, null, 2),
    );
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end();
}
