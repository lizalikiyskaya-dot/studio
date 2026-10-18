import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { libpqEnv, nodeConnectionString, parseDatabaseUrl } from "./apply-sql.mjs";
import {
  extractDatabaseUrl,
  findDestructive,
  formatGuardError,
  readBaseline,
  sortSqlNames,
  splitSql,
  statementsToRun,
} from "./sql-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(root, "scripts", "fixtures");
const bookPlan = await fs.readFile(path.join(fixtureDir, "2026-10-18-book-plan-board.sql"), "utf8");
const guides = await fs.readFile(path.join(fixtureDir, "2026-10-guides-library.sql"), "utf8");
const ADMIN = "postgresql://sqltest:sqltest-local@127.0.0.1:5432/postgres";
const PASSWORD = "sqltest-local";
const DECOY = "postgresql://decoy:decoy-password-should-not-leak@127.0.0.1:1/nope";

let pgReady = false;
const created = [];

function urlFor(name) {
  return `postgresql://sqltest:${PASSWORD}@127.0.0.1:5432/${name}?schema=public`;
}

async function recreate(name) {
  created.push(name);
  const admin = new pg.Client({ connectionString: ADMIN, connectionTimeoutMillis: 10000 });
  await admin.connect();
  try {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [name],
    );
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.query(`CREATE DATABASE ${name} OWNER sqltest`);
  } finally {
    await admin.end();
  }
}

test.before(async () => {
  try {
    const client = new pg.Client({ connectionString: ADMIN, connectionTimeoutMillis: 5000 });
    await client.connect();
    await client.end();
    pgReady = true;
  } catch {
    pgReady = false;
  }
});

test.after(async () => {
  if (!pgReady || created.length === 0) return;
  const admin = new pg.Client({ connectionString: ADMIN, connectionTimeoutMillis: 10000 });
  await admin.connect();
  try {
    for (const name of created) {
      await admin.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [name],
      );
      await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    }
  } finally {
    await admin.end();
  }
});

function assertNoSecrets(text) {
  assert.equal(text.includes(PASSWORD), false, "в выводе оказался пароль базы");
  assert.equal(text.includes("decoy-password-should-not-leak"), false, "в выводе оказался пароль-обманка");
  assert.equal(/postgres(?:ql)?:\/\/[^/\s]*@/i.test(text), false, "в выводе оказалась строка подключения с паролем");
}

function runScript(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", "apply-sql.mjs")], {
      cwd: root,
      env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => resolve({ code, stdout, stderr, output: stdout + stderr }));
  });
}

async function makeApp(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "studio-sql-"));
  const appPath = path.join(dir, "app");
  const backupDir = path.join(dir, "backups");
  await fs.mkdir(path.join(appPath, "docs", "sql"), { recursive: true });
  await fs.mkdir(backupDir);
  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(appPath, "docs", "sql", name), content);
  }
  return { dir, appPath, backupDir };
}

function baseEnv(appPath, backupDir, extra = {}) {
  return {
    ...process.env,
    APP_PATH: appPath,
    BACKUP_DIR: backupDir,
    SQL_TEST_HOOKS: "1",
    DATABASE_URL: DECOY,
    SYSTEMD_SERVICE: "",
    ...extra,
  };
}

test("baseline in the repo does not list the open PR files", async () => {
  const text = await fs.readFile(path.join(root, "docs", "sql", "baseline.txt"), "utf8");
  assert.deepEqual(readBaseline(text), []);
  assert.equal(text.includes("2026-10-18-book-plan-board.sql"), false);
  assert.equal(text.includes("2026-10-guides-library.sql"), false);
});

test("PR SQL passes the guard and keeps a non-dated name", () => {
  assert.deepEqual(findDestructive(bookPlan), []);
  assert.deepEqual(findDestructive(guides), []);
  const ordered = sortSqlNames(["2026-10-guides-library.sql", "2026-10-18-book-plan-board.sql"]);
  assert.deepEqual(ordered, ["2026-10-18-book-plan-board.sql", "2026-10-guides-library.sql"]);
  const runnable = statementsToRun(guides);
  assert.equal(runnable.some((stmt) => /^begin$/i.test(stmt.replace(/\s+/g, " ").trim())), false);
  assert.equal(runnable.some((stmt) => /^commit$/i.test(stmt.replace(/\s+/g, " ").trim())), false);
  const block = runnable.find((stmt) => stmt.includes("GuideAccess_guideId_fkey"));
  assert.ok(block);
  assert.match(block, /GuideProgress_studentId_fkey/);
  assert.match(block, /BEGIN/);
});

test("destructive commands are rejected and safe lookalikes are not", () => {
  const cases = [
    ["DROP TABLE \"User\";", "DROP"],
    ["drop index if exists \"User_email_idx\";", "DROP"],
    ["TRUNCATE \"User\";", "TRUNCATE"],
    ["DELETE FROM \"User\";", "DELETE"],
    ["ALTER TABLE \"User\" DROP COLUMN \"email\";", "DROP"],
    ["ALTER TABLE \"User\" RENAME TO \"Users\";", "RENAME"],
    ["ALTER TABLE \"User\" RENAME COLUMN \"email\" TO \"mail\";", "RENAME"],
    ["/* DROP TABLE \"User\" */\nALTER TABLE \"Act\" ADD COLUMN IF NOT EXISTS \"status\" TEXT;", null],
    ["-- DROP TABLE \"User\"\nALTER TABLE \"Act\" ADD COLUMN IF NOT EXISTS \"status\" TEXT;", null],
    ["ALTER TABLE \"Guide\" ALTER COLUMN \"updatedAt\" DROP DEFAULT;", null],
    ["ALTER TABLE \"Guide\" ALTER COLUMN \"note\" DROP NOT NULL;", null],
    ["ALTER TABLE \"GuideAccess\" ADD CONSTRAINT \"c\" FOREIGN KEY (\"studentId\") REFERENCES \"User\"(\"id\") ON DELETE CASCADE;", null],
    ["DO $$\nBEGIN\n  DELETE FROM \"User\";\nEND $$;", "DELETE"],
  ];
  for (const [sql, rule] of cases) {
    const hits = findDestructive(sql);
    if (rule === null) {
      assert.deepEqual(hits, [], sql);
    } else {
      assert.equal(hits[0]?.rule, rule, sql);
      assert.match(formatGuardError("x.sql", hits), /запрещённую команду/);
    }
  }
});

test("connection helpers do not echo the password", () => {
  const url = "postgresql://sqltest:s3cret%40pw@127.0.0.1:5432/studio?schema=public&sslmode=require";
  const env = libpqEnv(url, { PATH: "/usr/bin", PGPASSWORD: "stale", PGHOST: "old" });
  assert.equal(env.PGPASSWORD, "s3cret@pw");
  assert.equal(env.PGHOST, "127.0.0.1");
  assert.equal(env.PGDATABASE, "studio");
  assert.equal(env.PGSSLMODE, "require");
  assert.equal(env.PGHOST === "old", false);
  const nodeUrl = nodeConnectionString(url);
  assert.equal(nodeUrl.includes("schema="), false);
  assert.equal(nodeUrl.includes("s3cret"), true);
  assert.throws(() => parseDatabaseUrl("mysql://user:super-secret@h/db"), (err) => {
    assert.equal(String(err.message).includes("super-secret"), false);
    return true;
  });
  const parsed = extractDatabaseUrl('JWT_SECRET=keep\nexport DATABASE_URL="postgresql://u:p@h/db"\n');
  assert.equal(parsed, "postgresql://u:p@h/db");
});

test("no sql files means the database is not touched", async () => {
  const app = await makeApp({
    "baseline.txt": await fs.readFile(path.join(root, "docs", "sql", "baseline.txt"), "utf8"),
    "README.md": "not sql",
  });
  try {
    const result = await runScript(baseEnv(app.appPath, app.backupDir));
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /базу не трогаю/);
    assertNoSecrets(result.output);
    assert.deepEqual(await fs.readdir(app.backupDir), []);
  } finally {
    await fs.rm(app.dir, { recursive: true, force: true });
  }
});

test("missing DATABASE_URL stops before any apply", async () => {
  const app = await makeApp({ "2026-10-19-probe.sql": "SELECT 1;\n" });
  try {
    const env = baseEnv(app.appPath, app.backupDir);
    delete env.DATABASE_URL;
    const result = await runScript(env);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /DATABASE_URL/);
    assertNoSecrets(result.output);
    assert.deepEqual(await fs.readdir(app.backupDir), []);
  } finally {
    await fs.rm(app.dir, { recursive: true, force: true });
  }
});

test("--check accepts both PR files and rejects DROP", async () => {
  const ok = spawnSync(process.execPath, ["scripts/apply-sql.mjs", "--check", "scripts/fixtures/2026-10-guides-library.sql"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /OK 2026-10-guides-library.sql/);
  const badPath = path.join(os.tmpdir(), `drop-${process.pid}.sql`);
  await fs.writeFile(badPath, 'DROP TABLE "User";\n');
  const bad = spawnSync(process.execPath, ["scripts/apply-sql.mjs", "--check", badPath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /DROP/);
  await fs.unlink(badPath);
});

function requirePg(t) {
  if (!pgReady) {
    t.skip("локальный Postgres недоступен");
    return false;
  }
  return true;
}

async function query(databaseUrl, sql, params = []) {
  const client = new pg.Client({ connectionString: nodeConnectionString(databaseUrl) });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function execStatements(databaseUrl, sql) {
  const client = new pg.Client({ connectionString: nodeConnectionString(databaseUrl) });
  await client.connect();
  try {
    for (const stmt of splitSql(sql)) await client.query(stmt);
  } finally {
    await client.end();
  }
}

const RICH = `
CREATE TYPE "MaterialStatus" AS ENUM ('UNREAD', 'IN_PROGRESS', 'READ');
CREATE TABLE "User" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "note" text,
  "n" integer,
  "ok" boolean,
  "tags" text[],
  "meta" jsonb,
  "at" timestamptz,
  "status" "MaterialStatus",
  "amount" numeric(10,2),
  "serial" serial
);
CREATE TABLE "Note" (
  "id" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body" text NOT NULL
);
INSERT INTO "User" ("id", "name", "note", "n", "ok", "tags", "meta", "at", "status", "amount")
VALUES (
  'u1',
  'Лиза O''Brien',
  E'line1\\nline2\\\\slash',
  NULL,
  false,
  ARRAY['a,b', 'привет'],
  '{"k":"v"}',
  '2026-10-18T12:00:00Z',
  'UNREAD',
  12.50
);
INSERT INTO "Note" ("id", "userId", "body") VALUES ('n1', 'u1', 'заметка');
`;

async function snapshot(databaseUrl) {
  const users = await query(
    databaseUrl,
    `SELECT "id", "name", "note", "n", "ok", "tags"::text AS tags, "meta"::text AS meta,
            extract(epoch from "at") AS at, "status"::text AS status, "amount"::text AS amount, "serial"
     FROM "User" ORDER BY "id"`,
  );
  const notes = await query(databaseUrl, `SELECT "id", "userId", "body" FROM "Note" ORDER BY "id"`);
  return { users, notes };
}

async function restoreSql(databaseUrl, file) {
  const env = libpqEnv(databaseUrl, process.env);
  const result = spawnSync("psql", ["-w", "-X", "-v", "ON_ERROR_STOP=1", "-q", "-f", file], {
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout + result.stderr).includes(PASSWORD), false);
}

async function restoreDump(databaseUrl, file) {
  const env = libpqEnv(databaseUrl, process.env);
  const result = spawnSync(
    "pg_restore",
    ["--no-owner", "--no-acl", "--no-password", "--exit-on-error", "--dbname", env.PGDATABASE, file],
    { env, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout + result.stderr).includes(PASSWORD), false);
}

test("node backup roundtrip and node apply", { timeout: 60000 }, async (t) => {
  if (!requirePg(t)) return;
  const name = "sqltest_node_src";
  const restored = "sqltest_node_dst";
  await recreate(name);
  await recreate(restored);
  const url = urlFor(name);
  await execStatements(url, RICH);
  const before = await snapshot(url);
  const app = await makeApp({
    "2026-10-19-probe.sql": 'CREATE TABLE IF NOT EXISTS "runner_probe" ("id" integer);\n',
  });
  await fs.writeFile(path.join(app.appPath, ".env"), `JWT_SECRET=x\nDATABASE_URL=${url}\n`);
  try {
    const result = await runScript(
      baseEnv(app.appPath, app.backupDir, { SQL_BACKUP_VIA: "node", SQL_APPLY_VIA: "node" }),
    );
    assert.equal(result.code, 0, result.output);
    assertNoSecrets(result.output);
    assert.match(result.stdout, /node/);
    const probe = await query(url, `SELECT to_regclass('public.runner_probe') AS name`);
    assert.ok(probe[0].name);
    const files = (await fs.readdir(app.backupDir)).filter((item) => item.endsWith(".sql"));
    assert.equal(files.length, 1);
    const backup = path.join(app.backupDir, files[0]);
    const body = await fs.readFile(backup);
    assert.equal(body.includes(Buffer.from(PASSWORD)), false);
    await restoreSql(urlFor(restored), backup);
    const after = await snapshot(urlFor(restored));
    assert.deepEqual(after, before);
    const probeRestored = await query(urlFor(restored), `SELECT to_regclass('public.runner_probe') AS name`);
    assert.equal(probeRestored[0].name, null);
  } finally {
    await fs.rm(app.dir, { recursive: true, force: true });
  }
});

test("pg_dump roundtrip and psql apply", { timeout: 60000 }, async (t) => {
  if (!requirePg(t)) return;
  const name = "sqltest_dump_src";
  const restored = "sqltest_dump_dst";
  await recreate(name);
  await recreate(restored);
  const url = urlFor(name);
  await execStatements(url, RICH);
  const before = await snapshot(url);
  const app = await makeApp({
    "2026-10-19-probe.sql": 'CREATE TABLE IF NOT EXISTS "runner_probe" ("id" integer);\n',
  });
  await fs.writeFile(path.join(app.appPath, ".env"), `JWT_SECRET=x\nDATABASE_URL=${url}\n`);
  try {
    const result = await runScript(
      baseEnv(app.appPath, app.backupDir, { SQL_BACKUP_VIA: "pg_dump", SQL_APPLY_VIA: "psql" }),
    );
    assert.equal(result.code, 0, result.output);
    assertNoSecrets(result.output);
    assert.match(result.stdout, /pg_dump/);
    assert.match(result.stdout, /psql/);
    const files = (await fs.readdir(app.backupDir)).filter((item) => item.endsWith(".dump"));
    assert.equal(files.length, 1);
    const backup = path.join(app.backupDir, files[0]);
    const body = await fs.readFile(backup);
    assert.equal(body.includes(Buffer.from(PASSWORD)), false);
    assert.equal(body.subarray(0, 5).toString(), "PGDMP");
    await restoreDump(urlFor(restored), backup);
    assert.deepEqual(await snapshot(urlFor(restored)), before);
  } finally {
    await fs.rm(app.dir, { recursive: true, force: true });
  }
});

test("broken pg_dump falls back to node and a total backup failure applies nothing", { timeout: 60000 }, async (t) => {
  if (!requirePg(t)) return;
  const fake = path.join(os.tmpdir(), `fake-pgdump-${process.pid}`);
  await fs.writeFile(
    fake,
    "#!/bin/sh\necho \"failed postgresql://sqltest:sqltest-local@127.0.0.1:5432/db\" >&2\nexit 1\n",
    { mode: 0o755 },
  );
  const name = "sqltest_fallback";
  await recreate(name);
  const url = urlFor(name);
  await execStatements(url, 'CREATE TABLE "User" ("id" text PRIMARY KEY);');
  const app = await makeApp({
    "2026-10-19-probe.sql": 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "extra" text;\n',
  });
  await fs.writeFile(path.join(app.appPath, ".env"), `DATABASE_URL=${url}\n`);
  try {
    const ok = await runScript(
      baseEnv(app.appPath, app.backupDir, { SQL_PG_DUMP: fake, SQL_APPLY_VIA: "node" }),
    );
    assert.equal(ok.code, 0, ok.output);
    assert.match(ok.stdout, /не подошёл/);
    assert.match(ok.stdout, /\(node/);
    assertNoSecrets(ok.output);
    const cols = await query(
      url,
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'extra'`,
    );
    assert.equal(cols.length, 1);

    const blocked = await makeApp({
      "2026-10-20-again.sql": 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "extra2" text;\n',
    });
    await fs.writeFile(path.join(blocked.appPath, ".env"), `DATABASE_URL=${url}\n`);
    try {
      const bad = await runScript(
        baseEnv(blocked.appPath, blocked.backupDir, {
          SQL_PG_DUMP: fake,
          SQL_DISABLE_NODE_BACKUP: "1",
        }),
      );
      assert.equal(bad.code, 1, bad.output);
      assert.match(bad.stderr, /SQL не применялся/);
      assertNoSecrets(bad.output);
      const extra2 = await query(
        url,
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'extra2'`,
      );
      assert.equal(extra2.length, 0);
    } finally {
      await fs.rm(blocked.dir, { recursive: true, force: true });
    }
  } finally {
    await fs.rm(app.dir, { recursive: true, force: true });
    await fs.unlink(fake);
  }
});

test("second run applies nothing, DROP aborts before backup, failed statement rolls back", { timeout: 60000 }, async (t) => {
  if (!requirePg(t)) return;
  const name = "sqltest_once";
  await recreate(name);
  const url = urlFor(name);
  await execStatements(url, 'CREATE TABLE "probe" ("n" integer); CREATE TABLE "User" ("id" text PRIMARY KEY);');
  const app = await makeApp({
    "2026-10-19-once.sql": 'INSERT INTO "probe" ("n") VALUES (1);\n',
  });
  await fs.writeFile(path.join(app.appPath, ".env"), `DATABASE_URL=${url}\n`);
  try {
    const first = await runScript(baseEnv(app.appPath, app.backupDir, { SQL_APPLY_VIA: "psql" }));
    assert.equal(first.code, 0, first.output);
    assertNoSecrets(first.output);
    assert.equal((await query(url, 'SELECT count(*)::int AS n FROM "probe"'))[0].n, 1);
    const backupsAfterFirst = (await fs.readdir(app.backupDir)).length;
    assert.equal(backupsAfterFirst, 1);

    const second = await runScript(baseEnv(app.appPath, app.backupDir, { SQL_APPLY_VIA: "psql" }));
    assert.equal(second.code, 0, second.output);
    assert.match(second.stdout, /все уже в учёте/);
    assert.equal((await fs.readdir(app.backupDir)).length, 1);
    assert.equal((await query(url, 'SELECT count(*)::int AS n FROM "probe"'))[0].n, 1);

    await fs.writeFile(
      path.join(app.appPath, "docs", "sql", "2026-10-19-once.sql"),
      'INSERT INTO "probe" ("n") VALUES (2);\n',
    );
    const changed = await runScript(baseEnv(app.appPath, app.backupDir));
    assert.equal(changed.code, 1, changed.output);
    assert.match(changed.stderr, /содержимое изменилось/);
    assert.equal((await query(url, 'SELECT count(*)::int AS n FROM "probe"'))[0].n, 1);

    const dropApp = await makeApp({
      "2026-10-18-ok.sql": 'INSERT INTO "probe" ("n") VALUES (9);\n',
      "2026-10-19-bad.sql": 'DROP TABLE "User";\n',
    });
    await fs.writeFile(path.join(dropApp.appPath, ".env"), `DATABASE_URL=${url}\n`);
    try {
      const dropped = await runScript(baseEnv(dropApp.appPath, dropApp.backupDir));
      assert.equal(dropped.code, 1, dropped.output);
      assert.match(dropped.stderr, /DROP/);
      assertNoSecrets(dropped.output);
      assert.deepEqual(await fs.readdir(dropApp.backupDir), []);
      assert.equal((await query(url, 'SELECT count(*)::int AS n FROM "probe"'))[0].n, 1);
      const userTable = await query(url, `SELECT relname FROM pg_class WHERE relname = 'User'`);
      assert.equal(userTable.length, 1);
    } finally {
      await fs.rm(dropApp.dir, { recursive: true, force: true });
    }

    const boom = await makeApp({
      "2026-10-21-boom.sql": 'INSERT INTO "probe" ("n") VALUES (3);\nSELECT 1/0;\n',
    });
    await fs.writeFile(path.join(boom.appPath, ".env"), `DATABASE_URL=${url}\n`);
    try {
      for (const via of ["psql", "node"]) {
        const failed = await runScript(baseEnv(boom.appPath, boom.backupDir, { SQL_APPLY_VIA: via }));
        assert.equal(failed.code, 1, failed.output);
        assert.match(failed.stderr, /не попал/);
        assertNoSecrets(failed.output);
      }
      assert.equal((await query(url, 'SELECT count(*)::int AS n FROM "probe"'))[0].n, 1);
      const ledger = await query(url, `SELECT "filename" FROM "_applied_sql" WHERE "filename" = '2026-10-21-boom.sql'`);
      assert.equal(ledger.length, 0);
    } finally {
      await fs.rm(boom.dir, { recursive: true, force: true });
    }
  } finally {
    await fs.rm(app.dir, { recursive: true, force: true });
  }
});

test("baseline file is recorded and not executed", { timeout: 60000 }, async (t) => {
  if (!requirePg(t)) return;
  const name = "sqltest_base";
  await recreate(name);
  const url = urlFor(name);
  await execStatements(url, 'CREATE TABLE "Act" ("id" text PRIMARY KEY);');
  const app = await makeApp({
    "baseline.txt": "2026-10-18-book-plan-board.sql\n",
    "2026-10-18-book-plan-board.sql": bookPlan,
    "2026-10-19-live.sql": 'ALTER TABLE "Act" ADD COLUMN IF NOT EXISTS "live" text;\n',
  });
  await fs.writeFile(path.join(app.appPath, ".env"), `DATABASE_URL=${url}\n`);
  try {
    const result = await runScript(baseEnv(app.appPath, app.backupDir, { SQL_APPLY_VIA: "node" }));
    assert.equal(result.code, 0, result.output);
    assert.match(result.stdout, /без выполнения: 2026-10-18-book-plan-board.sql/);
    const status = await query(
      url,
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'Act' AND column_name IN ('status', 'live') ORDER BY column_name`,
    );
    assert.deepEqual(status.map((row) => row.column_name), ["live"]);
    const marked = await query(url, `SELECT "filename" FROM "_applied_sql" ORDER BY "filename"`);
    assert.deepEqual(marked.map((row) => row.filename), ["2026-10-18-book-plan-board.sql", "2026-10-19-live.sql"]);
  } finally {
    await fs.rm(app.dir, { recursive: true, force: true });
  }
});

test("keeps the latest 10 backups", { timeout: 60000 }, async (t) => {
  if (!requirePg(t)) return;
  const name = "sqltest_keep";
  await recreate(name);
  const url = urlFor(name);
  await execStatements(url, "SELECT 1;");
  const app = await makeApp({ "2026-10-19-probe.sql": "SELECT 1;\n" });
  await fs.writeFile(path.join(app.appPath, ".env"), `DATABASE_URL=${url}\n`);
  try {
    for (let i = 0; i < 12; i++) {
      const stamp = `200001${String(i + 1).padStart(2, "0")}T000000Z`;
      const file = path.join(app.backupDir, `studio-backup-${stamp}.dump`);
      await fs.writeFile(file, "old");
      const time = new Date(2000, 0, i + 1);
      await fs.utimes(file, time, time);
    }
    const result = await runScript(baseEnv(app.appPath, app.backupDir, { SQL_BACKUP_VIA: "node" }));
    assert.equal(result.code, 0, result.output);
    const left = await fs.readdir(app.backupDir);
    assert.equal(left.length, 10);
    assert.equal(left.some((name) => name.endsWith(".sql")), true);
    assert.equal(left.includes("studio-backup-20000101T000000Z.dump"), false);
  } finally {
    await fs.rm(app.dir, { recursive: true, force: true });
  }
});

const PR_SCHEMA = `
CREATE TYPE "MaterialStatus" AS ENUM ('UNREAD', 'IN_PROGRESS', 'READ');
CREATE TABLE "User" ("id" TEXT PRIMARY KEY);
CREATE TABLE "Act" ("id" TEXT PRIMARY KEY);
CREATE TABLE "StorylineBlock" ("id" TEXT PRIMARY KEY);
INSERT INTO "User" ("id") VALUES ('student-1');
`;

async function guideStats(databaseUrl) {
  const tables = await query(
    databaseUrl,
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('Guide', 'GuideAccess', 'GuideProgress')
     ORDER BY table_name`,
  );
  const cols = await query(
    databaseUrl,
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND (
       (table_name = 'Act' AND column_name = 'status') OR
       (table_name = 'StorylineBlock' AND column_name = 'span')
     )
     ORDER BY table_name, column_name`,
  );
  const constraints = await query(
    databaseUrl,
    `SELECT conname FROM pg_constraint WHERE conname LIKE 'Guide%' ORDER BY conname`,
  );
  return {
    tables: tables.map((row) => row.table_name),
    cols: cols.map((row) => `${row.table_name}.${row.column_name}`),
    constraints: constraints.map((row) => row.conname),
  };
}

test("PR #6 and PR #7 files apply once, are idempotent, and sort by name", { timeout: 120000 }, async (t) => {
  if (!requirePg(t)) return;
  for (const via of ["psql", "node"]) {
    const name = via === "psql" ? "sqltest_pr_psql" : "sqltest_pr_node";
    await recreate(name);
    const url = urlFor(name);
    await execStatements(url, PR_SCHEMA);
    const app = await makeApp({
      "2026-10-guides-library.sql": guides,
      "2026-10-18-book-plan-board.sql": bookPlan,
    });
    await fs.writeFile(path.join(app.appPath, ".env"), `DATABASE_URL=${url}\n`);
    try {
      const first = await runScript(
        baseEnv(app.appPath, app.backupDir, { SQL_APPLY_VIA: via, SQL_BACKUP_VIA: via === "psql" ? "pg_dump" : "node" }),
      );
      assert.equal(first.code, 0, first.output);
      assertNoSecrets(first.output);
      const planAt = first.stdout.indexOf("Применяю 2026-10-18-book-plan-board.sql");
      const guidesAt = first.stdout.indexOf("Применяю 2026-10-guides-library.sql");
      assert.ok(planAt >= 0 && guidesAt > planAt, first.stdout);
      const once = await guideStats(url);
      assert.deepEqual(once.tables, ["Guide", "GuideAccess", "GuideProgress"]);
      assert.deepEqual(once.cols, ["Act.status", "StorylineBlock.span"]);
      assert.equal(once.constraints.length, 7);

      const second = await runScript(
        baseEnv(app.appPath, app.backupDir, { SQL_APPLY_VIA: via, SQL_BACKUP_VIA: via === "psql" ? "pg_dump" : "node" }),
      );
      assert.equal(second.code, 0, second.output);
      assert.match(second.stdout, /все уже в учёте/);
      assert.equal((await fs.readdir(app.backupDir)).length, 1);
      assert.deepEqual(await guideStats(url), once);

      await execStatements(url, 'DELETE FROM "_applied_sql";');
      const third = await runScript(
        baseEnv(app.appPath, app.backupDir, { SQL_APPLY_VIA: via, SQL_BACKUP_VIA: via === "psql" ? "pg_dump" : "node" }),
      );
      assert.equal(third.code, 0, third.output);
      assert.deepEqual(await guideStats(url), once);
      const students = await query(url, 'SELECT "id" FROM "User"');
      assert.deepEqual(students, [{ id: "student-1" }]);
    } finally {
      await fs.rm(app.dir, { recursive: true, force: true });
    }
  }
});
