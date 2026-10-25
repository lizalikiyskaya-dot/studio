import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { findDestructive, statementsToRun } from "../../../scripts/sql-guard.mjs";

const root = process.cwd();
const schemaSql = fs.readFileSync(path.join(root, "docs/sql/2026-10-26-3-streak.sql"), "utf8");
const backfillSql = fs.readFileSync(path.join(root, "docs/sql/2026-10-26-4-streak-backfill.sql"), "utf8");
const ADMIN = process.env.BACKFILL_TEST_URL ?? "postgresql://studio:studio@127.0.0.1:5432/postgres";

const SCHEMA = `
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'MENTOR');
CREATE TYPE "TaskStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'NEEDS_REVISION', 'ACCEPTED');
CREATE TYPE "StarKind" AS ENUM ('WEEKLY', 'MAIN_TASK', 'CONTEST', 'PUBLISHER', 'CHAPTER');
CREATE TYPE "StarDirection" AS ENUM ('EARN', 'SPEND');
CREATE TYPE "ChapterReviewStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION', 'ACCEPTED');
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role "UserRole" NOT NULL
);
CREATE TABLE "WeeklyTask" (
  id TEXT PRIMARY KEY
);
CREATE TABLE "WeeklySubmission" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id),
  "weeklyTaskId" TEXT NOT NULL REFERENCES "WeeklyTask"(id),
  text TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Task" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id),
  status "TaskStatus" NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Book" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id)
);
CREATE TABLE "PlanChapter" (
  id TEXT PRIMARY KEY,
  "bookId" TEXT NOT NULL REFERENCES "Book"(id),
  "reviewStatus" "ChapterReviewStatus" NOT NULL
);
CREATE TABLE "StarAward" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id),
  kind "StarKind" NOT NULL,
  points INTEGER NOT NULL,
  "sourceId" TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  direction "StarDirection" NOT NULL DEFAULT 'EARN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "StarAward_studentId_kind_sourceId_key"
  ON "StarAward" ("studentId", kind, "sourceId");
`;

let pgReady = false;

test.before(async () => {
  const client = new pg.Client({ connectionString: ADMIN, connectionTimeoutMillis: 4000 });
  try {
    await client.connect();
    pgReady = true;
  } catch {
    pgReady = false;
  } finally {
    await client.end().catch(() => {});
  }
});

async function runFile(client: pg.Client, sql: string) {
  await client.query("BEGIN");
  try {
    for (const statement of statementsToRun(sql)) await client.query(statement);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function withDatabase(run: (client: pg.Client) => Promise<void>) {
  const admin = new pg.Client({ connectionString: ADMIN });
  await admin.connect();
  const name = `streak_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await admin.query(`CREATE DATABASE ${name}`);
  const client = new pg.Client({ connectionString: ADMIN.replace(/\/postgres(\?|$)/, `/${name}$1`) });
  await client.connect();
  try {
    await client.query(SCHEMA);
    await run(client);
  } finally {
    await client.end();
    await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
    await admin.end();
  }
}

test("файлы серии только добавляют и идут после журнала звёзд", () => {
  assert.equal(findDestructive(schemaSql).length, 0);
  assert.equal(findDestructive(backfillSql).length, 0);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS "StreakWeek"/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS "StreakVacation"/);
  assert.match(schemaSql, /ADD VALUE 'STREAK'/);
  assert.equal(schemaSql.includes("INSERT"), false);
  assert.equal(backfillSql.includes("PlanChapter"), false);
  assert.equal(backfillSql.includes("UPDATE"), false);
  assert.match(backfillSql, /'STREAK'::"StarKind"/);
  assert.match(backfillSql, /ON CONFLICT \("studentId", "weekStart"\) DO NOTHING/);
  assert.match(backfillSql, /ON CONFLICT \("studentId", kind, "sourceId"\) DO NOTHING/);
  const names = fs.readdirSync(path.join(root, "docs/sql")).filter((name) => name.endsWith(".sql")).sort();
  const ledger = names.indexOf("2026-10-26-1-star-ledger.sql");
  const schema = names.indexOf("2026-10-26-3-streak.sql");
  const backfill = names.indexOf("2026-10-26-4-streak-backfill.sql");
  assert.ok(ledger >= 0 && schema > ledger && backfill > schema);
});

test("старая сдача засчитывает неделю один раз, принятая глава без даты не засчитывается", async (t) => {
  if (!pgReady) {
    t.skip("локальный Postgres недоступен");
    return;
  }
  await withDatabase(async (client) => {
    await client.query(`INSERT INTO "User" (id, name, role) VALUES ('vika', 'Виктория', 'STUDENT')`);
    await client.query(`INSERT INTO "WeeklyTask" (id) VALUES ('w1'), ('w2')`);
    await client.query(`
      INSERT INTO "WeeklySubmission" (id, "studentId", "weeklyTaskId", text, "createdAt") VALUES
        ('sub-same', 'vika', 'w1', 'текст', '2026-10-20 10:00:00'),
        ('sub-old', 'vika', 'w2', 'текст', '2026-09-29 10:00:00')
    `);
    await client.query(`
      INSERT INTO "Task" (id, "studentId", status, "updatedAt")
      VALUES ('task-same', 'vika', 'SUBMITTED', '2026-10-21 10:00:00')
    `);
    await client.query(`INSERT INTO "Book" (id, "studentId") VALUES ('book', 'vika')`);
    await client.query(`
      INSERT INTO "PlanChapter" (id, "bookId", "reviewStatus")
      VALUES ('ch', 'book', 'ACCEPTED')
    `);

    await runFile(client, schemaSql);
    await runFile(client, backfillSql);
    await runFile(client, backfillSql);

    const weeks = await client.query(`SELECT "weekStart"::text AS week FROM "StreakWeek" ORDER BY 1`);
    assert.deepEqual(
      weeks.rows.map((row) => row.week),
      ["2026-09-28", "2026-10-19"],
    );
    const bonus = await client.query(`SELECT COUNT(*)::int AS n FROM "StarAward" WHERE kind = 'STREAK'`);
    assert.equal(bonus.rows[0].n, 0);

    await client.query(`
      INSERT INTO "StreakWeek" (id, "studentId", "weekStart") VALUES
        ('gap-1', 'vika', '2026-10-05'),
        ('gap-2', 'vika', '2026-10-12')
    `);
    await runFile(client, backfillSql);
    await runFile(client, backfillSql);
    const stars = await client.query(`
      SELECT "sourceId", points FROM "StarAward" WHERE kind = 'STREAK' ORDER BY "sourceId"
    `);
    assert.deepEqual(stars.rows, [{ sourceId: "4", points: 3 }]);
  });
});
