import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../../scripts/sql-guard.mjs";

const root = path.resolve(import.meta.dirname, "../../..");
const sqlPath = path.join(root, "docs/sql/2026-10-20-victoria-book-notes.sql");
const actionsPath = path.join(root, "src/features/materials/actions.ts");

const STUDENT = "cmqtuks2e000j0rpow7knseef";
const HERO = "Тысячеликий герой, Дж. Кэмпбелл";
const HERO_MONTH = "декабрь 2026 – январь 2027";
const THESAURUS = "Тезаурус эмоций, А. Акерман, Б. Пульизи";
const THESAURUS_MONTH = "февраль 2027";
const THESAURUS_NOTE = "Прочитать вводную часть, дальше пользоваться как словарём";
const STYLE = "Стилистика русского языка, И. Голуб";
const STYLE_MONTH = "апрель – май 2027";
const STYLE_NOTE = "Не целиком: разделы о лексике и синтаксисе";

test("book note SQL adds a column, is idempotent in shape, and does not email", () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "note" TEXT/);
  assert.match(sql, new RegExp(STUDENT));
  assert.match(sql, /Тысячеликий герой%/);
  assert.match(sql, /Тезаурус эмоций%/);
  assert.match(sql, /Стилистика русского языка%/);
  assert.ok(sql.includes(HERO_MONTH));
  assert.ok(sql.includes(THESAURUS_NOTE));
  assert.ok(sql.includes(STYLE_NOTE));
  assert.equal(sql.includes("\u2013"), true);
  assert.equal(findDestructive(sql).length, 0);
  assert.doesNotMatch(sql, /\b(status|optional)\b/i);
  assert.doesNotMatch(sql, /STUDENT_EDIT_EMAILS/);

  const actions = fs.readFileSync(actionsPath, "utf8");
  assert.match(actions, /export async function setMaterialNote/);
  assert.doesNotMatch(actions, /notifyStudentOfMentorEdit|STUDENT_EDIT_EMAILS|sendMail/);
});

test("Victoria's book rows move month and note out of the title", () => {
  const databaseUrl = process.env.DATABASE_URL ?? "postgresql://studio:studio@localhost:5432/studio";
  const probe = spawnSync("psql", [databaseUrl, "-c", "SELECT 1"], { encoding: "utf8" });
  if (probe.status !== 0) return;

  const table = spawnSync(
    "psql",
    [databaseUrl, "-At", "-c", `SELECT to_regclass('public."Material"')`],
    { encoding: "utf8" },
  );
  if (table.status !== 0 || !table.stdout.trim()) return;

  const existing = spawnSync(
    "psql",
    [databaseUrl, "-At", "-c", `SELECT count(*) FROM "Material" WHERE "studentId" = '${STUDENT}'`],
    { encoding: "utf8" },
  );
  if (existing.status !== 0) return;
  if (existing.stdout.trim() !== "0") return;

  const sql = fs.readFileSync(sqlPath, "utf8");
  const script = `
BEGIN;
INSERT INTO "User" (id, name, email, "passwordHash", role, status, "createdAt", "updatedAt")
SELECT '${STUDENT}', 'Виктория', 'victoria-note-spec@example.com', 'x', 'STUDENT', 'APPROVED', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE id = '${STUDENT}');
INSERT INTO "User" (id, name, email, "passwordHash", role, status, "createdAt", "updatedAt")
SELECT 'victoria-note-other', 'Другая', 'victoria-note-other@example.com', 'x', 'STUDENT', 'APPROVED', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE id = 'victoria-note-other');
INSERT INTO "Material" (id, "studentId", "order", category, title, status, optional, month) VALUES
  ('victoria-note-1', '${STUDENT}', 0, 'BOOK', 'С первой фразы, Л. Крон', 'READ', false, NULL),
  ('victoria-note-2', '${STUDENT}', 2, 'BOOK', 'Создание арки персонажа, К. Уэйланд', 'READ', false, NULL),
  ('victoria-note-3', '${STUDENT}', 3, 'BOOK', 'Путешествие писателя, К. Воглер', 'READ', false, NULL),
  ('victoria-note-4', '${STUDENT}', 10, 'BOOK', 'Внутренний рассказчик, У. Сторр', 'IN_PROGRESS', false, 'ноябрь 2026'),
  ('victoria-note-5', '${STUDENT}', 11, 'BOOK', 'Тысячеликий герой, Дж. Кэмпбелл (декабрь 2026 – январь 2027)', 'UNREAD', false, NULL),
  ('victoria-note-6', '${STUDENT}', 12, 'BOOK', 'Тезаурус эмоций: руководство для писателей и сценаристов, Анджела Акерман, Бекка Пульизи (февраль 2027, вводная часть, дальше как словарь)', 'IN_PROGRESS', true, NULL),
  ('victoria-note-7', '${STUDENT}', 20, 'BOOK', 'Слово живое и мёртвое, Н. Галь', 'UNREAD', false, 'март 2027'),
  ('victoria-note-8', '${STUDENT}', 21, 'BOOK', 'Стилистика русского языка, И. Голуб (апрель – май 2027, разделы о лексике и синтаксисе)', 'UNREAD', false, NULL),
  ('victoria-note-9', '${STUDENT}', 30, 'BOOK', 'Ещё книга', 'READ', false, NULL),
  ('victoria-note-10', '${STUDENT}', 40, 'BOOK', 'Тысячеликий герой, другое издание', 'UNREAD', false, NULL),
  ('victoria-note-handout', '${STUDENT}', 0, 'HANDOUT', 'Стилистика русского языка, И. Голуб (апрель – май 2027, разделы о лексике и синтаксисе)', 'UNREAD', false, NULL),
  ('victoria-note-other-book', 'victoria-note-other', 11, 'BOOK', 'Тысячеликий герой, Дж. Кэмпбелл (декабрь 2026 – январь 2027)', 'UNREAD', false, NULL);
CREATE TEMP TABLE note_keep AS
  SELECT id, title, COALESCE(month, '') AS month, status::text AS status, optional, category::text AS category
  FROM "Material";
${sql}
SELECT 'PASS';
CREATE TEMP TABLE note_once AS
  SELECT id, title, COALESCE(month, '') AS month, COALESCE(note, '') AS note,
    status::text AS status, optional, category::text AS category
  FROM "Material"
  WHERE id LIKE 'victoria-note-%';
${sql}
SELECT 'PASS';
SELECT 'DIVERGE ' || count(*)::text
FROM "Material" AS now
JOIN note_once AS once ON once.id = now.id
WHERE now.title IS DISTINCT FROM once.title
  OR COALESCE(now.month, '') IS DISTINCT FROM once.month
  OR COALESCE(now.note, '') IS DISTINCT FROM once.note
  OR now.status::text IS DISTINCT FROM once.status
  OR now.optional IS DISTINCT FROM once.optional
  OR now.category::text IS DISTINCT FROM once.category;
SELECT id, title, COALESCE(month, ''), COALESCE(note, ''), status::text, optional::text, category::text
FROM "Material"
WHERE id LIKE 'victoria-note-%'
ORDER BY id;
SELECT 'DRIFT ' || count(*)::text
FROM "Material" AS now
JOIN note_keep AS before ON before.id = now.id
WHERE now.id NOT LIKE 'victoria-note-%'
  AND (
    now.title IS DISTINCT FROM before.title
    OR COALESCE(now.month, '') IS DISTINCT FROM before.month
    OR now.status::text IS DISTINCT FROM before.status
    OR now.optional IS DISTINCT FROM before.optional
    OR now.category::text IS DISTINCT FROM before.category
  );
ROLLBACK;
`;

  const run = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-At", "-F", "\t"], {
    input: script,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, `${run.stderr}\n${run.stdout}`);

  const lines = run.stdout.trim().split("\n").filter(Boolean);
  assert.equal(lines.filter((line) => line === "PASS").length, 2);
  const drift = lines.find((line) => line.startsWith("DRIFT "));
  assert.equal(drift, "DRIFT 0");

  const rows = new Map(
    lines
      .filter((line) => line.startsWith("victoria-note-"))
      .map((line) => {
        const [id, title, month, note, status, optional, category] = line.split("\t");
        return [id, { title, month, note, status, optional, category }] as const;
      }),
  );

  assert.equal(rows.get("victoria-note-1")?.title, "С первой фразы, Л. Крон");
  assert.equal(rows.get("victoria-note-1")?.month, "");
  assert.equal(rows.get("victoria-note-1")?.note, "");
  assert.equal(rows.get("victoria-note-1")?.status, "READ");

  assert.equal(rows.get("victoria-note-4")?.month, "ноябрь 2026");
  assert.equal(rows.get("victoria-note-4")?.status, "IN_PROGRESS");
  assert.equal(rows.get("victoria-note-4")?.title, "Внутренний рассказчик, У. Сторр");

  assert.deepEqual(rows.get("victoria-note-5"), {
    title: HERO,
    month: HERO_MONTH,
    note: "",
    status: "UNREAD",
    optional: "false",
    category: "BOOK",
  });
  assert.deepEqual(rows.get("victoria-note-6"), {
    title: THESAURUS,
    month: THESAURUS_MONTH,
    note: THESAURUS_NOTE,
    status: "IN_PROGRESS",
    optional: "true",
    category: "BOOK",
  });
  assert.equal(rows.get("victoria-note-7")?.title, "Слово живое и мёртвое, Н. Галь");
  assert.equal(rows.get("victoria-note-7")?.month, "март 2027");
  assert.equal(rows.get("victoria-note-7")?.note, "");
  assert.equal(rows.get("victoria-note-7")?.status, "UNREAD");

  assert.deepEqual(rows.get("victoria-note-8"), {
    title: STYLE,
    month: STYLE_MONTH,
    note: STYLE_NOTE,
    status: "UNREAD",
    optional: "false",
    category: "BOOK",
  });
  assert.equal(rows.get("victoria-note-9")?.title, "Ещё книга");
  assert.equal(rows.get("victoria-note-10")?.title, "Тысячеликий герой, другое издание");
  assert.equal(rows.get("victoria-note-10")?.month, "");
  assert.equal(rows.get("victoria-note-10")?.note, "");
  assert.equal(rows.get("victoria-note-handout")?.category, "HANDOUT");
  assert.equal(
    rows.get("victoria-note-handout")?.title,
    "Стилистика русского языка, И. Голуб (апрель – май 2027, разделы о лексике и синтаксисе)",
  );
  assert.equal(
    rows.get("victoria-note-other-book")?.title,
    "Тысячеликий герой, Дж. Кэмпбелл (декабрь 2026 – январь 2027)",
  );
  assert.equal(rows.get("victoria-note-other-book")?.note, "");
});
