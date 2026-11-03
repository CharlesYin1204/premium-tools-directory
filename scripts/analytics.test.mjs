import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool, query } from "../lib/db.js";
import { dateWhere, report, csv } from "../lib/analytics.js";
import { reportColumns } from "../lib/report-format.js";
const hasDatabase = Boolean(
  process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME,
);
test("昨天按上海日期计算，拒绝不存在的日期", () => {
  const r = dateWhere(
    new URLSearchParams({ range: "yesterday" }),
    Date.parse("2026-09-24T00:30:00Z"),
  );
  assert.equal(r.start, "2026-09-23");
  assert.equal(r.end, "2026-09-23");
  assert.equal(r.previousStart, "2026-09-22");
  for (const date of ["2026-02-30", "2026-04-31", "2026-13-01"])
    assert.throws(
      () => dateWhere(new URLSearchParams({ start: date, end: date })),
      (e) => e.status === 400,
    );
});
test(
  "统计按公司ID聚合，保留归属快照，去重、同比周期及四类导出一致（事务回滚）",
  { skip: !hasDatabase },
  async () => {
    const db = await pool.getConnection(),
      channel = "verify-" + randomUUID(),
      coA = randomUUID(),
      coB = randomUUID(),
      entryA = randomUUID(),
      entryB = randomUUID(),
      placement = randomUUID(),
      content = randomUUID();
    await db.beginTransaction();
    try {
      async function put(name, options = {}) {
        const row = {
          id: randomUUID(),
          time: "2001-01-02 04:00:00",
          session: "session-a",
          entry: entryA,
          company: coA,
          company_name: "旧公司名",
          entry_name: "入口A",
          content: null,
          placement: null,
          test: false,
          ...options,
        };
        await query(
          "INSERT IGNORE INTO events(event_id,event_name,occurred_at,session_id,entry_id,company_id,company_name,entry_name,content_id,placement_id,device,channel,is_test) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            row.id,
            name,
            row.time,
            row.session,
            row.entry,
            row.company,
            row.company_name,
            row.entry_name,
            row.content,
            row.placement,
            "pc",
            channel,
            row.test,
          ],
          db,
        );
        return row.id;
      }
      // 上期两次点击。当前四次点击中同会话同入口重复点击仍全部计数。
      await put("entry_click", { time: "2001-01-01 04:00:00" });
      await put("entry_click", { time: "2001-01-01 05:00:00" });
      const duplicate = await put("entry_click");
      await put("entry_click", { id: duplicate });
      await put("entry_click", { company_name: "公司改名", placement });
      await put("entry_click", {
        company: coB,
        company_name: "归属B",
        content,
      });
      await put("entry_click", { entry: entryB, entry_name: "入口B" });
      await put("entry_impression", { placement });
      await put("entry_impression", { placement });
      await put("content_view", { entry: null, content });
      await put("video_effective", { entry: null, content });
      await put("page_view", { entry: null, company: null });
      await put("entry_click", { test: true });
      const params = new URLSearchParams({
        start: "2001-01-02",
        end: "2001-01-02",
        channel,
      });
      const r = await report(params, db);
      assert.equal(r.metrics.clicks, 4);
      assert.equal(r.previous.clicks, 2);
      assert.equal(r.changes.clicks, 1);
      assert.equal(r.companies.length, 2);
      const a = r.companies.find((c) => c.company_id === coA);
      assert.equal(a.clicks, 3);
      assert.equal(a.sessions, 1);
      assert.equal(r.metrics.sessions, 1);
      assert.equal(r.metrics.sessions_unknown, 0);
      assert.ok(r.entries.every((e) => e.sessions === 1));
      assert.equal(r.promotions[0].sessions, 1);
      assert.equal(a.change, 0.5);
      assert.equal(r.companies.find((c) => c.company_id === coB).change, null);
      assert.equal(r.metrics.promotions, 1);
      assert.equal(r.promotions[0].ctr, 0.5);
      assert.equal(r.contents[0].views, 1);
      assert.equal(r.contents[0].consumes, 1);
      assert.equal(r.contents[0].clicks, 1);
      assert.equal(r.reconciliation.matched, true);
      assert.equal(r.entries.filter((e) => e.entry_id === entryA).length, 3); // 公司和位置均保留独立快照
      for (const view of Object.keys(reportColumns)) {
        const exported = csv(r, view);
        for (const [, title] of reportColumns[view])
          assert.ok(exported.includes('"' + title + '"'));
        assert.ok(exported.includes(channel));
        assert.ok(exported.includes("时间口径"));
        assert.ok(exported.includes("IP去重口径"));
        assert.equal(exported.split("\r\n").length, r[view].length + 7);
      }
      params.set("placement_id", placement);
      const p = await report(params, db);
      assert.equal(p.metrics.clicks, 1);
      assert.equal(p.metrics.promotions, 1);
      assert.equal(p.metrics.impressions, 2);
      assert.equal(p.reconciliation.matched, true);
      params.set("placement_id", "navigation");
      const n = await report(params, db);
      assert.equal(n.metrics.clicks, 3);
      assert.equal(n.metrics.promotions, 0);
      params.set("company_id", coB);
      const b = await report(params, db);
      assert.equal(b.metrics.clicks, 1);
      assert.equal(b.companies[0].company_id, coB);
      await put("entry_click", { session: null });
      await put("entry_click", { session: "" });
      await put("entry_click", { session: "session-b" });
      const all = await report(
        new URLSearchParams({
          start: "2001-01-02",
          end: "2001-01-02",
          channel,
        }),
        db,
      );
      assert.equal(all.metrics.clicks, 7);
      assert.equal(all.metrics.sessions, 2);
      assert.equal(all.metrics.sessions_unknown, 2);
      const known = all.companies.find((c) => c.company_id === coA);
      assert.equal(known.sessions, 2);
      assert.equal(known.sessions_unknown, 2);
      assert.equal(
        all.companies.reduce((n, c) => n + c.sessions, 0),
        3,
      );
      assert.equal(all.metrics.sessions, 2);
      assert.ok(csv(all, "companies").includes("无会话点击"));
      const across = await report(
        new URLSearchParams({
          start: "2001-01-01",
          end: "2001-01-02",
          channel,
        }),
        db,
      );
      assert.equal(across.metrics.clicks, 9);
      assert.equal(across.metrics.sessions, 2);
      assert.equal(across.metrics.sessions_unknown, 2);
    } finally {
      await db.rollback();
      db.release();
      await pool.end();
    }
  },
);
