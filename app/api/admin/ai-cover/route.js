import { NextResponse } from "next/server";
import {
  requireUser,
  checkOrigin,
  rateLimit,
  AppError,
} from "../../../../lib/security.js";
import { readJsonObject } from "../../../../lib/api-contract.js";
import { query, decode } from "../../../../lib/db.js";
import { resource, mutate } from "../../../../lib/resources.js";
import {
  reviewedItemsWithCovers,
  scopeFingerprint,
} from "../../../../lib/ai-scope.js";
import {
  coverModel,
  generateCover,
  ensureCoverCandidates,
} from "../../../../lib/ai-cover.js";
import { syncedContent } from "../../../../lib/synced-content.js";
export const dynamic = "force-dynamic";
const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function itemById(id) {
  const [row] = await query(
    "SELECT * FROM resources WHERE id=? AND kind='contents'",
    [id],
  );
  if (!row || decode(row.draft).type !== "video")
    throw new AppError(404, "视频不存在");
  return resource(row);
}
export async function GET(req) {
  try {
    await requireUser("read");
    const item = await itemById(new URL(req.url).searchParams.get("id") || "");
    const reviewed = !!(
        await reviewedItemsWithCovers({ contents: [item] }, "contents")
      ).length,
      model = await coverModel();
    return json({
      available: reviewed && !!model && !syncedContent(item),
      reason: !reviewed
        ? "此内容尚未通过资料核验"
        : syncedContent(item)
          ? "受管来源的封面需在来源系统维护"
          : !model
            ? "暂无启用的图像生成模型"
            : "",
      model: model?.name || "",
    });
  } catch (e) {
    return json(
      { message: e.status ? e.message : "暂时无法读取图像配置" },
      e.status || 503,
    );
  }
}
export async function POST(req) {
  try {
    checkOrigin(req);
    const user = await requireUser("write"),
      body = await readJsonObject(req, 4096),
      item = await itemById(typeof body.id === "string" ? body.id : "");
    if (item.version !== body.version)
      throw new AppError(409, "视频已被修改，请刷新后重试");
    if (
      !(await reviewedItemsWithCovers({ contents: [item] }, "contents")).length
    )
      throw new AppError(422, "此内容尚未通过资料核验");
    if (syncedContent(item))
      throw new AppError(409, "受管来源的封面需在来源系统维护");
    if (body.action === "generate") {
      await rateLimit("ai-cover:" + user.id, 5, 3600);
      return json(await generateCover(item, body.style || "cinematic", user));
    }
    if (body.action === "apply") {
      await ensureCoverCandidates();
      const [candidate] = await query(
        "SELECT * FROM ai_cover_candidates WHERE id=? AND actor_id=? AND resource_id=? AND created_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 24 HOUR)",
        [body.candidate_id || "", user.id, item.id],
      );
      if (
        !candidate ||
        candidate.resource_version !== item.version ||
        candidate.applied_version
      )
        throw new AppError(
          409,
          "候选封面已过期、已使用或视频已变化，请重新生成",
        );
      const saved = await mutate(
        "contents",
        {
          id: item.id,
          version: item.version,
          action: "save",
          data: { ...item, cover_url: candidate.url },
        },
        user,
      );
      await query(
        "UPDATE ai_cover_candidates SET applied_version=?,applied_fingerprint=? WHERE id=?",
        [saved.version, scopeFingerprint(saved.resource), candidate.id],
      );
      return json({
        ...saved,
        message: "封面已写入草稿，发布后才会更新前台。",
      });
    }
    throw new AppError(400, "请选择生成或应用封面");
  } catch (e) {
    return json(
      {
        message: e.status ? e.message : "封面处理暂时不可用，原线上封面未改变",
        field_errors: e.fields || {},
      },
      e.status || 503,
    );
  }
}
