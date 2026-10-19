import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../../scripts/sql-guard.mjs";
import { moveBookMonth, type BookMonthRow } from "./bookMonth";

const root = path.resolve(import.meta.dirname, "../../..");
const sqlPath = path.join(root, "docs/sql/2026-10-19-book-month.sql");

function row(title: string, extra: Partial<BookMonthRow> = {}): BookMonthRow {
  return { title, month: null, optional: false, ...extra };
}

test("the example title keeps every word and a second pass is a no-op", () => {
  const source = row("Аура, Карлос Фуэнтес (ноябрь 2026, по желанию)");
  const moved = moveBookMonth(source);
  assert.deepEqual(moved, {
    title: "Аура, Карлос Фуэнтес",
    month: "ноябрь 2026",
    optional: true,
  });
  assert.deepEqual(moveBookMonth(moved), moved);
  const before = source.title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const after = `${moved.title} ${moved.month} по желанию`
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  assert.deepEqual(after.sort(), before.sort());
});

test("month-only, wish-only, and untouched parentheses", () => {
  assert.deepEqual(moveBookMonth(row("Сто лет одиночества (декабрь 2026)")), {
    title: "Сто лет одиночества",
    month: "декабрь 2026",
    optional: false,
  });
  assert.deepEqual(moveBookMonth(row("Книга (по желанию)", { optional: false })), {
    title: "Книга",
    month: null,
    optional: true,
  });
  assert.deepEqual(moveBookMonth(row("Книга (по желанию, март 2027)")), {
    title: "Книга",
    month: "март 2027",
    optional: true,
  });
  assert.deepEqual(moveBookMonth(row("Книга (Ноябрь 2026, по желанию)")), {
    title: "Книга",
    month: "Ноябрь 2026",
    optional: true,
  });
  assert.deepEqual(moveBookMonth(row("Книга (роман) (декабрь 2026)")), {
    title: "Книга (роман)",
    month: "декабрь 2026",
    optional: false,
  });
  const novel = row("Книга (роман)");
  assert.deepEqual(moveBookMonth(novel), novel);
  const note = row("Книга (ноябрь 2026, заметка)");
  assert.deepEqual(moveBookMonth(note), note);
  const onlyParen = row("(ноябрь 2026)");
  assert.deepEqual(moveBookMonth(onlyParen), onlyParen);
  const season = row("Книга (осень 2026)");
  assert.deepEqual(moveBookMonth(season), season);
  assert.deepEqual(moveBookMonth(row("Книга (мая 2026)")), {
    title: "Книга",
    month: "мая 2026",
    optional: false,
  });
});

test("a month already stored is left alone", () => {
  const edited = row("Аура (ноябрь 2026, по желанию)", {
    month: "январь 2027",
    optional: false,
  });
  assert.deepEqual(moveBookMonth(edited), edited);
});

test("the month SQL only adds a column and is not destructive", () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "month" TEXT/);
  assert.deepEqual(findDestructive(sql), []);
});

test("the SQL move matches the function and rolls back", () => {
  const databaseUrl = process.env.DATABASE_URL ?? "postgresql://studio:studio@localhost:5432/studio";
  const probe = spawnSync("psql", [databaseUrl, "-c", "SELECT 1"], { encoding: "utf8" });
  if (probe.status !== 0) {
    return;
  }

  const titles = [
    "Аура, Карлос Фуэнтес (ноябрь 2026, по желанию)",
    "Сто лет одиночества (декабрь 2026)",
    "Книга (по желанию)",
    "Книга (по желанию, март 2027)",
    "Книга (Ноябрь 2026, по желанию)",
    "Книга (роман) (декабрь 2026)",
    "Книга (роман)",
    "Книга (ноябрь 2026, заметка)",
    "(ноябрь 2026)",
    "Книга (осень 2026)",
    "Книга (мая 2026)",
    "  Книга   (  ноябрь 2026 , по желанию )  ",
  ];

  const sql = fs.readFileSync(sqlPath, "utf8");
  const quoted = titles.map((title) => `'${title.replace(/'/g, "''")}'`).join(",");
  const report = `
SELECT id, title, COALESCE(month, ''), optional::text, category::text
FROM "Material"
WHERE id LIKE 'month-spec-%'
ORDER BY id;
`;
  const script = `
BEGIN;
CREATE TEMP TABLE month_keep AS
  SELECT id, title, optional
  FROM "Material";
${sql}
INSERT INTO "Material" (id, "studentId", "order", category, title, optional)
SELECT
  'month-spec-' || i::text,
  (SELECT id FROM "User" ORDER BY id LIMIT 1),
  800 + i,
  'BOOK'::"MaterialCategory",
  title,
  false
FROM unnest(ARRAY[${quoted}]) WITH ORDINALITY AS sample(title, i);
INSERT INTO "Material" (id, "studentId", "order", category, title, optional)
SELECT
  'month-spec-handout',
  (SELECT id FROM "User" ORDER BY id LIMIT 1),
  899,
  'HANDOUT'::"MaterialCategory",
  'Методичка (ноябрь 2026, по желанию)',
  false;
${sql}
SELECT 'PASS';
${report}
${sql}
SELECT 'PASS';
${report}
SELECT 'DRIFT ' || count(*)::text
FROM "Material" AS now
JOIN month_keep AS before ON before.id = now.id
WHERE now.title IS DISTINCT FROM before.title
   OR now.optional IS DISTINCT FROM before.optional;
ROLLBACK;
`;

  const run = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-At", "-F", "\t"], {
    input: script,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, `${run.stderr}\n${run.stdout}`);

  const lines = run.stdout.trim().split("\n").filter(Boolean);
  const marker = lines.filter((line) => line === "PASS").length;
  assert.equal(marker, 2);
  const drift = lines.find((line) => line.startsWith("DRIFT "));
  assert.equal(drift, "DRIFT 0");
  const dataLines = lines.filter((line) => line.startsWith("month-spec-"));
  assert.equal(dataLines.length, (titles.length + 1) * 2);
  const firstPass = dataLines.slice(0, titles.length + 1);
  const secondPass = dataLines.slice(titles.length + 1);
  assert.deepEqual(secondPass, firstPass);

  const byTitle = new Map(titles.map((title, index) => [`month-spec-${index + 1}`, title]));
  for (const line of firstPass) {
    const [id, title, month, optional, category] = line.split("\t");
    if (id === "month-spec-handout") {
      assert.equal(category, "HANDOUT");
      assert.equal(title, "Методичка (ноябрь 2026, по желанию)");
      assert.equal(month, "");
      assert.equal(optional, "false");
      continue;
    }
    const source = byTitle.get(id);
    assert.ok(source, id);
    const expected = moveBookMonth(row(source));
    assert.equal(title, expected.title, id);
    assert.equal(month, expected.month ?? "", id);
    assert.equal(optional, String(expected.optional), id);
    assert.equal(category, "BOOK", id);
  }
});
