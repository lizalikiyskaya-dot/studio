-- Разовое начисление звёзд за уже сделанную работу.
-- Правила те же, что у новых событий (src/features/stars/rules.ts):
--   3 — задание со статусом «сдано на проверку» или «принято»
--       («на доработке» и «в процессе» дают 0)
--   5 — конкурс, 10 — издательство: любой статус, кроме «не отправлено»
--   2 — непустая сдача задания недели, один раз на неделю
-- Строка с тем же учеником, видом и источником уже есть — её не трогаем.
-- Письма никому не отправляются. Задания и заявки не создаются и не правятся.
-- После начисления Надежде (id сверяется с именем) дописывается одна строка
-- «завершение книги», чтобы сумма стала ровно 100. Если сумма уже больше,
-- очки этой строки отрицательные и итог всё равно 100.

ALTER TABLE "StarAward" ADD COLUMN IF NOT EXISTS "note" TEXT NOT NULL DEFAULT '';

INSERT INTO "StarAward" ("id", "studentId", "kind", "points", "sourceId", "note", "createdAt")
SELECT
  'bf-task-' || t."id",
  t."studentId",
  'MAIN_TASK'::"StarKind",
  3,
  t."id",
  '',
  CURRENT_TIMESTAMP
FROM "Task" t
WHERE t."status" IN ('SUBMITTED', 'ACCEPTED')
ON CONFLICT ("studentId", "kind", "sourceId") DO NOTHING;

INSERT INTO "StarAward" ("id", "studentId", "kind", "points", "sourceId", "note", "createdAt")
SELECT
  'bf-sub-' || s."id",
  s."studentId",
  CASE WHEN s."type" = 'PUBLISHER' THEN 'PUBLISHER'::"StarKind" ELSE 'CONTEST'::"StarKind" END,
  CASE WHEN s."type" = 'PUBLISHER' THEN 10 ELSE 5 END,
  s."id",
  '',
  CURRENT_TIMESTAMP
FROM "Submission" s
WHERE s."status" <> 'NOT_SENT'
ON CONFLICT ("studentId", "kind", "sourceId") DO NOTHING;

INSERT INTO "StarAward" ("id", "studentId", "kind", "points", "sourceId", "note", "createdAt")
SELECT
  'bf-week-' || w."studentId" || '-' || w."weeklyTaskId",
  w."studentId",
  'WEEKLY'::"StarKind",
  2,
  w."weeklyTaskId",
  '',
  CURRENT_TIMESTAMP
FROM "WeeklySubmission" w
WHERE btrim(w."text") <> ''
ON CONFLICT ("studentId", "kind", "sourceId") DO NOTHING;

-- Доплата до 100. Id берём, только если имя содержит «Надежда».
-- Если этот id не её, и Надежда на платформе ровно одна — берём её.
-- Если Надежд несколько и id не совпал, доплату не ставим.
INSERT INTO "StarAward" ("id", "studentId", "kind", "points", "sourceId", "note", "createdAt")
SELECT
  'book-complete-' || chosen."id",
  chosen."id",
  'MAIN_TASK'::"StarKind",
  100 - COALESCE((
    SELECT SUM(a."points")
    FROM "StarAward" a
    WHERE a."studentId" = chosen."id"
      AND NOT (a."kind" = 'MAIN_TASK' AND a."sourceId" = 'book-complete')
  ), 0),
  'book-complete',
  'завершение книги',
  CURRENT_TIMESTAMP
FROM (
  SELECT "id"
  FROM "User"
  WHERE "role" = 'STUDENT'
    AND "name" ILIKE '%Надежда%'
    AND (
      "id" = 'cmqz75vnn000v0qmokx9zgt89'
      OR (
        NOT EXISTS (
          SELECT 1
          FROM "User" known
          WHERE known."id" = 'cmqz75vnn000v0qmokx9zgt89'
            AND known."role" = 'STUDENT'
            AND known."name" ILIKE '%Надежда%'
        )
        AND (
          SELECT COUNT(*)
          FROM "User" named
          WHERE named."role" = 'STUDENT'
            AND named."name" ILIKE '%Надежда%'
        ) = 1
      )
    )
  ORDER BY CASE WHEN "id" = 'cmqz75vnn000v0qmokx9zgt89' THEN 0 ELSE 1 END
  LIMIT 1
) AS chosen
ON CONFLICT ("studentId", "kind", "sourceId") DO UPDATE
SET
  "points" = EXCLUDED."points",
  "note" = EXCLUDED."note";
