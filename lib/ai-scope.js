import { query } from "./db.js";
import { createHash } from "node:crypto";
import registry from "../config/ai-reviewed.json" with { type: "json" };
import generalTools from "../data/general-tools.json" with { type: "json" };
const fields = [
  "name",
  "title",
  "slug",
  "description",
  "summary",
  "tags",
  "aliases",
  "target_url",
  "backup_url",
  "android_url",
  "ios_url",
  "landing_mode",
  "action_mode",
  "icon_url",
  "cover_url",
  "play_url",
  "source_system",
  "source_id",
  "type",
  "category_ids",
  "entry_ids",
  "rights_status",
];
export function scopeFingerprint(item) {
  return createHash("sha256")
    .update(JSON.stringify(fields.map((key) => [key, item[key] ?? null])))
    .digest("hex");
}
export function reviewedBaseFingerprint(id) {
  return registry.resources[id] || null;
}
const reviewedTools = new Map(
  generalTools.entries.map((item) => [item.slug, item]),
);
function isReviewedGeneralTool(item) {
  const source = reviewedTools.get(item.source_id);
  return (
    item.source_system === "premium-general-tools" &&
    !!source &&
    item.slug === source.slug &&
    item.name === source.name &&
    item.target_url === source.url
  );
}
export function reviewedItems(data, kind, variants = []) {
  return (data[kind] || []).filter((item) => {
    if (kind === "entries" && isReviewedGeneralTool(item)) return true;
    const base = registry.resources[item.id];
    if (!base) return false;
    const fingerprint = scopeFingerprint(item);
    return (
      base === fingerprint ||
      (kind === "contents" &&
        variants.some(
          (v) =>
            v.resource_id === item.id &&
            v.base_fingerprint === base &&
            v.applied_fingerprint === fingerprint,
        ))
    );
  });
}
export async function reviewedItemsWithCovers(data, kind) {
  if (kind !== "contents") return reviewedItems(data, kind);
  const ids = (data[kind] || [])
    .filter((item) => registry.resources[item.id])
    .map((item) => item.id);
  if (!ids.length) return [];
  let variants = [];
  try {
    variants = await query(
      "SELECT resource_id,base_fingerprint,applied_fingerprint FROM ai_cover_candidates WHERE applied_fingerprint IS NOT NULL AND resource_id IN (" +
        ids.map(() => "?").join(",") +
        ")",
      ids,
    );
  } catch {
    /* Missing candidate records never expand the reviewed catalogue. */
  }
  return reviewedItems(data, kind, variants);
}
export function resolveMatches(parsed, candidates, limit = 12) {
  if (
    !parsed ||
    typeof parsed.intent !== "string" ||
    !Array.isArray(parsed.matches)
  )
    throw Error("INVALID_AI_RESPONSE");
  const byId = new Map(candidates.map((item) => [item.id, item])),
    seen = new Set();
  return parsed.matches
    .filter(
      (row) =>
        row &&
        typeof row.id === "string" &&
        byId.has(row.id) &&
        typeof row.confidence === "number" &&
        row.confidence >= 0.65 &&
        row.confidence <= 1 &&
        typeof row.reason === "string" &&
        row.reason.trim(),
    )
    .sort((a, b) => b.confidence - a.confidence)
    .flatMap((row) => {
      if (seen.has(row.id)) return [];
      seen.add(row.id);
      return [{ ...byId.get(row.id), reason: row.reason.trim().slice(0, 240) }];
    })
    .slice(0, limit);
}
export function approvedMetadataUrl(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw Error("请输入完整 HTTPS 网址");
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    value.length > 2048
  )
    throw Error("仅支持不含凭据的标准 HTTPS 网址");
  if (!registry.metadata_hosts.includes(u.hostname.toLowerCase()))
    throw Error("此域名尚未进入合规网址审核名单，暂不能自动识别");
  return u;
}
