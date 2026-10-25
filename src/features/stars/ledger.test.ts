import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { findDestructive, statementsToRun } from "../../../scripts/sql-guard.mjs";

const root = process.cwd();
const ledgerSql = fs.readFileSync(path.join(root, "docs/sql/2026-10-26-1-star-ledger.sql"), "utf8");
const chapterSql = fs.readFileSync(path.join(root, "docs/sql/2026-10-26-2-star-chapter.sql"), "utf8");
const ADMIN = process.env.BACKFILL_TEST_URL ?? "postgresql://studio:studio@127.0.0.1:5432/postgres";

const SCHEMA = `
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'MENTOR');
CREATE TYPE "StarKind" AS ENUM ('WEEKLY', 'MAIN_TASK', 'CONTEST', 'PUBLISHER');
CREATE TYPE "ChapterReviewStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION', 'ACCEPTED');
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role "UserRole" NOT NULL
);
CREATE TABLE "Book" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id)
);
CREATE TABLE "PlanChapter" (
  id TEXT PRIMARY KEY,
  "bookId" TEXT NOT NULL REFERENCES "Book"(id),
  "reviewStatus" "ChapterReviewStatus" NOT NULL DEFAULT 'IN_PROGRESS'
);
CREATE TABLE "StarAward" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id),
  kind "StarKind" NOT NULL,
  points INTEGER NOT NULL,
  "sourceId" TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "StarAward_studentId_kind_sourceId_key"
  ON "StarAward" ("studentId", "kind", "sourceId");
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

async function runSql(client: pg.Client, sql: string) {
  for (const statement of statementsToRun(sql)) {
    await client.query(statement);
  }
}

async function withDatabase(run: (client: pg.Client) => Promise<void>) {
  const admin = new pg.Client({ connectionString: ADMIN });
  await admin.connect();
  const name = `ledger_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

test("файлы журнала только добавляют и идут после статуса главы", () => {
  assert.equal(findDestructive(ledgerSql).length, 0);
  assert.equal(findDestructive(chapterSql).length, 0);
  assert.match(ledgerSql, /ADD COLUMN IF NOT EXISTS "direction"/);
  assert.match(ledgerSql, /DEFAULT 'EARN'/);
  assert.match(chapterSql, /reviewStatus" = 'ACCEPTED'/);
  assert.match(chapterSql, /ON CONFLICT \("studentId", "kind", "sourceId"\) DO NOTHING/);
  assert.equal(chapterSql.includes("UPDATE"), false);
  const names = fs.readdirSync(path.join(root, "docs/sql")).filter((name) => name.endsWith(".sql")).sort();
  const review = names.indexOf("2026-10-25-chapter-review-status.sql");
  const ledger = names.indexOf("2026-10-26-1-star-ledger.sql");
  const chapter = names.indexOf("2026-10-26-2-star-chapter.sql");
  assert.ok(review >= 0 && ledger > review && chapter > ledger);
});

test("старые очки сохраняются, принятая глава даёт 3 один раз", async (t) => {
  if (!pgReady) {
    t.skip("локальный Postgres недоступен");
    return;
  }
  await withDatabase(async (client) => {
    await client.query(`
      INSERT INTO "User" (id, name, role) VALUES
        ('vika', 'Виктория', 'STUDENT'),
        ('sasha', 'Саша', 'STUDENT')
    `);
    await client.query(`
      INSERT INTO "Book" (id, "studentId") VALUES
        ('book-v', 'vika'),
        ('book-s', 'sasha')
    `);
    await client.query(`
      INSERT INTO "PlanChapter" (id, "bookId", "reviewStatus") VALUES
        ('ch-yes', 'book-v', 'ACCEPTED'),
        ('ch-review', 'book-v', 'IN_REVIEW'),
        ('ch-sent', 'book-s', 'SUBMITTED'),
        ('ch-s-yes', 'book-s', 'ACCEPTED')
    `);
    await client.query(`
      INSERT INTO "StarAward" (id, "studentId", kind, points, "sourceId", note)
      VALUES ('old-vika', 'vika', 'MAIN_TASK', 21, 'task-1', '')
    `);

    await runSql(client, ledgerSql);
    const kept = await client.query(`SELECT points, direction::text AS direction FROM "StarAward" WHERE id = 'old-vika'`);
    assert.equal(kept.rows[0].points, 21);
    assert.equal(kept.rows[0].direction, "EARN");

    await runSql(client, chapterSql);
    await runSql(client, chapterSql);
    const rows = await client.query(`
      SELECT "studentId",
        COALESCE(SUM(points) FILTER (WHERE direction = 'EARN'), 0)::int AS earned,
        COUNT(*) FILTER (WHERE kind = 'CHAPTER')::int AS chapters
      FROM "StarAward"
      GROUP BY "studentId"
      ORDER BY "studentId"
    `);
    assert.deepEqual(rows.rows, [
      { studentId: "sasha", earned: 3, chapters: 1 },
      { studentId: "vika", earned: 24, chapters: 1 },
    ]);

    await client.query(`
      INSERT INTO "StarAward" (id, "studentId", kind, points, "sourceId", note, direction)
      VALUES ('spend-vika', 'vika', 'MAIN_TASK', 4, 'shop-1', '', 'SPEND')
    `);
    const balance = await client.query(`
      SELECT
        COALESCE(SUM(points) FILTER (WHERE direction = 'EARN'), 0)::int AS earned,
        COALESCE(SUM(points) FILTER (WHERE direction = 'EARN'), 0)::int
          - COALESCE(SUM(points) FILTER (WHERE direction = 'SPEND'), 0)::int AS balance
      FROM "StarAward"
      WHERE "studentId" = 'vika'
    `);
    assert.equal(balance.rows[0].earned, 24);
    assert.equal(balance.rows[0].balance, 20);
  });
});
