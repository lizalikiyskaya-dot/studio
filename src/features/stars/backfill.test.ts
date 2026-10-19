import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import pg from "pg";
import { findDestructive, sortSqlNames, statementsToRun } from "../../../scripts/sql-guard.mjs";
import { BOOK_COMPLETE_NOTE, BOOK_COMPLETE_SOURCE_ID, NADEZHDA_USER_ID } from "./rules";

const root = process.cwd();
const sqlPath = path.join(root, "docs/sql/2026-10-20-star-backfill.sql");
const sql = fs.readFileSync(sqlPath, "utf8");
const ADMIN = process.env.BACKFILL_TEST_URL ?? "postgresql://studio:studio@127.0.0.1:5432/postgres";

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

test("файл начисления только добавляет строки и идёт после таблицы звёзд", () => {
  assert.equal(findDestructive(sql).length, 0);
  assert.equal(sql.includes("sendMail"), false);
  assert.equal(sql.includes(NADEZHDA_USER_ID), true);
  assert.equal(sql.includes(BOOK_COMPLETE_SOURCE_ID), true);
  assert.equal(sql.includes(BOOK_COMPLETE_NOTE), true);
  assert.match(sql, /status" IN \('SUBMITTED', 'ACCEPTED'\)/);
  assert.match(sql, /status" <> 'NOT_SENT'/);
  assert.match(sql, /btrim\(w\."text"\) <> ''/);
  assert.match(sql, /ON CONFLICT \("studentId", "kind", "sourceId"\) DO NOTHING/);
  const names = fs.readdirSync(path.join(root, "docs/sql")).filter((name) => name.endsWith(".sql"));
  const sorted = sortSqlNames(names);
  const weekly = sorted.indexOf("2026-10-19-weekly-tasks.sql");
  const backfill = sorted.indexOf("2026-10-20-star-backfill.sql");
  assert.ok(weekly >= 0 && backfill > weekly);
});

test("файлы кабинета наставника не отправляют письма", () => {
  for (const file of ["src/features/quotes/actions.ts", "src/features/weekly/mentorActions.ts"]) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    assert.equal(text.includes("sendMail"), false, file);
    assert.equal(text.includes("notify"), false, file);
  }
});

const SCHEMA = `
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'MENTOR');
CREATE TYPE "TaskStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'NEEDS_REVISION', 'ACCEPTED');
CREATE TYPE "SubmissionType" AS ENUM ('CONTEST', 'PUBLISHER');
CREATE TYPE "SubmissionStatus" AS ENUM ('WAITING', 'ACCEPTED', 'REJECTED', 'NOT_SENT', 'SENT');
CREATE TYPE "StarKind" AS ENUM ('WEEKLY', 'MAIN_TASK', 'CONTEST', 'PUBLISHER');
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role "UserRole" NOT NULL
);
CREATE TABLE "Task" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id),
  status "TaskStatus" NOT NULL
);
CREATE TABLE "Submission" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id),
  type "SubmissionType" NOT NULL,
  status "SubmissionStatus" NOT NULL
);
CREATE TABLE "WeeklySubmission" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id),
  "weeklyTaskId" TEXT NOT NULL,
  text TEXT NOT NULL
);
CREATE TABLE "StarAward" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id),
  kind "StarKind" NOT NULL,
  points INTEGER NOT NULL,
  "sourceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "StarAward_studentId_kind_sourceId_key"
  ON "StarAward" ("studentId", "kind", "sourceId");
`;

type Report = {
  name: string;
  tasks: number;
  contests: number;
  publishers: number;
  weekly: number;
  before: number;
  total: number;
};

async function apply(client: pg.Client) {
  for (const statement of statementsToRun(sql)) {
    await client.query(statement);
  }
}

async function report(client: pg.Client): Promise<Report[]> {
  const { rows } = await client.query<Report>(`
    SELECT u.name,
      COUNT(*) FILTER (WHERE a.kind = 'MAIN_TASK' AND a."sourceId" <> 'book-complete')::int AS tasks,
      COUNT(*) FILTER (WHERE a.kind = 'CONTEST')::int AS contests,
      COUNT(*) FILTER (WHERE a.kind = 'PUBLISHER')::int AS publishers,
      COUNT(*) FILTER (WHERE a.kind = 'WEEKLY')::int AS weekly,
      COALESCE(SUM(a.points) FILTER (WHERE NOT (a.kind = 'MAIN_TASK' AND a."sourceId" = 'book-complete')), 0)::int AS before,
      COALESCE(SUM(a.points), 0)::int AS total
    FROM "User" u
    LEFT JOIN "StarAward" a ON a."studentId" = u.id
    GROUP BY u.id, u.name
  `);
  return rows
    .map((row) => ({
      name: row.name,
      tasks: Number(row.tasks),
      contests: Number(row.contests),
      publishers: Number(row.publishers),
      weekly: Number(row.weekly),
      before: Number(row.before),
      total: Number(row.total),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

async function withDatabase(run: (client: pg.Client) => Promise<void>) {
  const admin = new pg.Client({ connectionString: ADMIN });
  await admin.connect();
  const name = `bf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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

test("начисление за прошлую работу идемпотентно и доводит Надежду до 100", async (t) => {
  if (!pgReady) {
    t.skip("локальный Postgres недоступен");
    return;
  }
  await withDatabase(async (client) => {
    await client.query(`
      INSERT INTO "User" (id, name, role) VALUES
        ('vika', 'Виктория', 'STUDENT'),
        ($1, 'Надежда', 'STUDENT'),
        ('yan', 'Ян', 'STUDENT'),
        ('vanya', 'Ваня', 'STUDENT'),
        ('nad2', 'Надежда Вторая', 'STUDENT')
    `, [NADEZHDA_USER_ID]);
    await client.query(`
      INSERT INTO "Task" (id, "studentId", status) VALUES
        ('t-v-acc', 'vika', 'ACCEPTED'),
        ('t-v-sub', 'vika', 'SUBMITTED'),
        ('t-v-rev', 'vika', 'NEEDS_REVISION'),
        ('t-v-prog', 'vika', 'IN_PROGRESS'),
        ('t-n-1', $1, 'ACCEPTED'),
        ('t-n-2', $1, 'ACCEPTED'),
        ('t-n-3', $1, 'ACCEPTED'),
        ('t-y-1', 'yan', 'SUBMITTED'),
        ('t-va-1', 'vanya', 'NEEDS_REVISION'),
        ('t-n2-1', 'nad2', 'ACCEPTED')
    `, [NADEZHDA_USER_ID]);
    await client.query(`
      INSERT INTO "Submission" (id, "studentId", type, status) VALUES
        ('s-v-sent', 'vika', 'CONTEST', 'SENT'),
        ('s-v-no', 'vika', 'CONTEST', 'NOT_SENT'),
        ('s-v-pub', 'vika', 'PUBLISHER', 'REJECTED'),
        ('s-n-c', $1, 'CONTEST', 'ACCEPTED'),
        ('s-n-p', $1, 'PUBLISHER', 'SENT'),
        ('s-y', 'yan', 'CONTEST', 'NOT_SENT'),
        ('s-va', 'vanya', 'PUBLISHER', 'WAITING')
    `, [NADEZHDA_USER_ID]);
    await client.query(`
      INSERT INTO "WeeklySubmission" (id, "studentId", "weeklyTaskId", text) VALUES
        ('w-v-1', 'vika', 'week-a', 'текст'),
        ('w-v-2', 'vika', 'week-b', '   '),
        ('w-n-1', $1, 'week-a', 'а'),
        ('w-n-2', $1, 'week-c', 'б'),
        ('w-va', 'vanya', 'week-a', '')
    `, [NADEZHDA_USER_ID]);
    await client.query(`
      INSERT INTO "StarAward" (id, "studentId", kind, points, "sourceId")
      VALUES ('already-vika', 'vika', 'MAIN_TASK', 3, 't-v-acc')
    `);

    await apply(client);
    const first = await report(client);
    assert.deepEqual(first, [
      { name: "Ваня", tasks: 0, contests: 0, publishers: 1, weekly: 0, before: 10, total: 10 },
      { name: "Виктория", tasks: 2, contests: 1, publishers: 1, weekly: 1, before: 23, total: 23 },
      { name: "Надежда", tasks: 3, contests: 1, publishers: 1, weekly: 2, before: 28, total: 100 },
      { name: "Надежда Вторая", tasks: 1, contests: 0, publishers: 0, weekly: 0, before: 3, total: 3 },
      { name: "Ян", tasks: 1, contests: 0, publishers: 0, weekly: 0, before: 3, total: 3 },
    ]);

    const bonus = await client.query(`SELECT points, note FROM "StarAward" WHERE "sourceId" = 'book-complete'`);
    assert.equal(bonus.rowCount, 1);
    assert.equal(bonus.rows[0].points, 72);
    assert.equal(bonus.rows[0].note, BOOK_COMPLETE_NOTE);
    const dup = await client.query(`SELECT COUNT(*)::int AS n FROM "StarAward" WHERE "studentId" = 'vika' AND kind = 'MAIN_TASK' AND "sourceId" = 't-v-acc'`);
    assert.equal(dup.rows[0].n, 1);

    await apply(client);
    assert.deepEqual(await report(client), first);
  });
});

test("если известный id не Надежда, доплата уходит единственной Надежде", async (t) => {
  if (!pgReady) {
    t.skip("локальный Postgres недоступен");
    return;
  }
  await withDatabase(async (client) => {
    await client.query(`
      INSERT INTO "User" (id, name, role) VALUES
        ($1, 'Виктория', 'STUDENT'),
        ('nad', 'Надежда', 'STUDENT')
    `, [NADEZHDA_USER_ID]);
    await client.query(`INSERT INTO "Task" (id, "studentId", status) VALUES ('t1', 'nad', 'ACCEPTED')`);
    await apply(client);
    const rows = await report(client);
    assert.deepEqual(rows.find((row) => row.name === "Надежда"), {
      name: "Надежда", tasks: 1, contests: 0, publishers: 0, weekly: 0, before: 3, total: 100,
    });
    assert.equal(rows.find((row) => row.name === "Виктория")?.total, 0);
  });
});

test("две Надежды и чужой id — доплату не ставим", async (t) => {
  if (!pgReady) {
    t.skip("локальный Postgres недоступен");
    return;
  }
  await withDatabase(async (client) => {
    await client.query(`
      INSERT INTO "User" (id, name, role) VALUES
        ('a', 'Надежда', 'STUDENT'),
        ('b', 'Надежда Сергеевна', 'STUDENT')
    `);
    await client.query(`INSERT INTO "Task" (id, "studentId", status) VALUES ('t1', 'a', 'ACCEPTED'), ('t2', 'b', 'SUBMITTED')`);
    await apply(client);
    const rows = await report(client);
    assert.equal(rows.every((row) => row.total === row.before), true);
    assert.equal(rows.find((row) => row.name === "Надежда")?.total, 3);
    assert.equal(rows.find((row) => row.name === "Надежда Сергеевна")?.total, 3);
  });
});
