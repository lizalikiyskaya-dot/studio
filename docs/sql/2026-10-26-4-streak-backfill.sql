-- Уже сданная работа засчитывает неделю. Одна строка на ученика и понедельник.
-- Задание недели — по дате первой сдачи. Основное задание — по последнему изменению
-- карточки, если статус «сдано на проверку» или «принято». У главы нет даты статуса,
-- поэтому старые главы сюда не попадают.
-- Бонус за уже набранную серию: 4 недели — 3, 8 — 5, 12 — 8, дальше каждые 4 недели — 3.
-- Повторный запуск ничего не добавляет. Существующие строки не меняются.

INSERT INTO "StreakWeek" (id, "studentId", "weekStart")
SELECT
  'bf-streak-w-' || s.id,
  s."studentId",
  (date_trunc('week', ((s."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow')))::date
FROM "WeeklySubmission" s
ON CONFLICT ("studentId", "weekStart") DO NOTHING;

INSERT INTO "StreakWeek" (id, "studentId", "weekStart")
SELECT
  'bf-streak-t-' || t.id,
  t."studentId",
  (date_trunc('week', ((t."updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Moscow')))::date
FROM "Task" t
WHERE t.status IN ('SUBMITTED', 'ACCEPTED')
ON CONFLICT ("studentId", "weekStart") DO NOTHING;

WITH weeks AS (
  SELECT
    "studentId",
    "weekStart",
    "weekStart" - (ROW_NUMBER() OVER (PARTITION BY "studentId" ORDER BY "weekStart"))::int * 7 AS grp
  FROM "StreakWeek"
),
runs AS (
  SELECT "studentId", COUNT(*)::int AS len
  FROM weeks
  GROUP BY "studentId", grp
),
best AS (
  SELECT "studentId", MAX(len)::int AS best
  FROM runs
  GROUP BY "studentId"
),
milestones AS (
  SELECT
    b."studentId",
    gs.len,
    CASE WHEN gs.len = 8 THEN 5 WHEN gs.len = 12 THEN 8 ELSE 3 END AS points
  FROM best b
  CROSS JOIN LATERAL generate_series(4, b.best, 4) AS gs(len)
  WHERE b.best >= 4
)
INSERT INTO "StarAward" (id, "studentId", kind, points, "sourceId", note, direction, "createdAt")
SELECT
  'bf-streak-' || m."studentId" || '-' || m.len,
  m."studentId",
  'STREAK'::"StarKind",
  m.points,
  m.len::text,
  '',
  'EARN'::"StarDirection",
  CURRENT_TIMESTAMP
FROM milestones m
ON CONFLICT ("studentId", kind, "sourceId") DO NOTHING;
