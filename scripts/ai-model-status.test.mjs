import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { pool } from "../lib/db.js";
const hasDatabase = Boolean(
  process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME,
);
test(
  "修改连接信息清除旧检查结果，同连接编辑名称保留结果；事务回滚不保留数据",
  { skip: !hasDatabase },
  async () => {
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      const id = randomUUID();
      await conn.execute(
        "INSERT INTO ai_models(id,name,base_url,model_id,capabilities,last_check_status,last_checked_at,last_error) VALUES(?,?,?,?,?,'ok',UTC_TIMESTAMP(),'old')",
        [
          id,
          "status regression",
          "https://example.org/v1",
          "model",
          JSON.stringify(["vision"]),
        ],
      );
      const source = (
        await readFile(new URL("../lib/ai.js", import.meta.url), "utf8")
      )
        .replace(/^import .*;\n/gm, "")
        .replace(/export /g, "")
        .replace("let ready;", "let ready=Promise.resolve();");
      const query = async (sql, args) => {
        const [rows] = await conn.execute(sql, args);
        return rows;
      };
      const save = new Function(
        "query",
        "safeUrl",
        "AppError",
        source + ";return saveAiModel;",
      )(query, async () => {}, class extends Error {});
      const body = {
        id,
        name: "renamed",
        base_url: "https://example.org/v1",
        model_id: "model",
        capabilities: ["vision"],
        enabled: false,
      };
      await save(body, { username: "transaction-regression" });
      assert.equal(
        (
          await query("SELECT last_check_status FROM ai_models WHERE id=?", [
            id,
          ])
        )[0].last_check_status,
        "ok",
      );
      await save(
        { ...body, model_id: "changed" },
        { username: "transaction-regression" },
      );
      const [row] = await query(
        "SELECT last_check_status,last_checked_at,last_error FROM ai_models WHERE id=?",
        [id],
      );
      assert.equal(row.last_check_status, "not_checked");
      assert.equal(row.last_checked_at, null);
      assert.equal(row.last_error, null);
    } finally {
      await conn.rollback();
      conn.release();
      await pool.end();
    }
  },
);
