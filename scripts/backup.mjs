import {
  mkdir,
  mkdtemp,
  writeFile,
  readFile,
  copyFile,
  rm,
  chmod,
  rename,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
export const dumpOptions = [
  "--single-transaction",
  "--quick",
  "--hex-blob",
  "--routines",
  "--events",
  "--triggers",
  "--skip-add-locks",
  "--skip-comments",
  "--order-by-primary",
  "--set-gtid-purged=OFF",
];
export function run(bin, args, options = {}) {
  return new Promise((ok, fail) => {
    const child = spawn(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    const out = [],
      err = [];
    child.stdout?.on("data", (b) => out.push(b));
    child.stderr?.on("data", (b) => err.push(b));
    child.on("error", fail);
    child.on("close", (code) =>
      code === 0
        ? ok(Buffer.concat(out))
        : fail(Error(bin + " failed with exit " + code)),
    );
  });
}
const hash = (b) => createHash("sha256").update(b).digest("hex");
export async function backup() {
  process.umask(0o077);
  const started = new Date().toISOString();
  const root = resolve("storage/backups");
  await mkdir(root, { recursive: true, mode: 0o700 });
  await chmod(root, 0o700);
  const pending = await mkdtemp(join(root, ".pending-")),
    temp = await mkdtemp(join(tmpdir(), "daohang-backup-auth-"));
  try {
    const quote = (s) =>
      '"' +
      String(s || "")
        .replaceAll("\\", "\\\\")
        .replaceAll('"', '\\"')
        .replaceAll("\n", "\\n")
        .replaceAll("\r", "\\r") +
      '"';
    const config = join(temp, "client.cnf");
    await writeFile(
      config,
      "[client]\nhost=" +
        quote(process.env.DB_HOST) +
        "\nuser=" +
        quote(process.env.DB_USER) +
        "\npassword=" +
        quote(process.env.DB_PASSWORD) +
        "\n",
      { mode: 0o600 },
    );
    if (!process.env.DB_NAME) throw Error("DB_NAME is required");
    await writeFile(
      join(pending, "database.sql"),
      await run("/www/server/mysql/bin/mysqldump", [
        "--defaults-extra-file=" + config,
        ...dumpOptions,
        process.env.DB_NAME,
      ]),
      { mode: 0o600 },
    );
    await run("tar", [
      "-czf",
      join(pending, "media.tar.gz"),
      "storage/uploads",
      "public/media",
    ]);
    await run("tar", [
      "-czf",
      join(pending, "application.tar.gz"),
      "app",
      "components",
      "lib",
      "scripts",
      "deploy",
      "project-docs",
      "package.json",
      "package-lock.json",
      "next.config.mjs",
    ]);
    await copyFile(".env.local", join(pending, "environment.private"));
    await chmod(join(pending, "environment.private"), 0o600);
    await copyFile(
      "/etc/systemd/system/tools-directory.service",
      join(pending, "service.unit"),
    );
    let worker = false;
    try {
      await copyFile(
        "/etc/systemd/system/tools-sync-worker.service",
        join(pending, "worker-service.unit"),
      );
      worker = true;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const files = {};
    for (const name of [
      "database.sql",
      "media.tar.gz",
      "application.tar.gz",
      "environment.private",
      "service.unit",
      ...(worker ? ["worker-service.unit"] : []),
    ]) {
      const content = await readFile(join(pending, name));
      files[name] = { bytes: content.length, sha256: hash(content) };
    }
    await writeFile(
      join(pending, "manifest.json"),
      JSON.stringify(
        {
          format: 1,
          started,
          finished: new Date().toISOString(),
          database: process.env.DB_NAME,
          node: process.version,
          files,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    const target = join(
      root,
      "snapshot-" +
        started.replaceAll(":", "-") +
        "-" +
        pending.split("-").at(-1),
    );
    await rename(pending, target);
    return target;
  } catch (e) {
    await rm(pending, { recursive: true, force: true });
    throw e;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
if (process.argv[1] === new URL(import.meta.url).pathname)
  console.log(await backup());
