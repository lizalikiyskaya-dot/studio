-- Значки за уже случившуюся работу. Дата у строки — день, когда файл применится:
-- у старых событий своей отметки «значок выдан» нет.
-- «10 000 знаков» и «Вторая редакция» здесь не выдаются: их ставит Лиза.
-- Повторный запуск ничего не добавляет. Снятый значок не возвращается:
-- уникальная пара ученик + значок уже занята.

-- Первая страница: основное задание «сдано на проверку» или «принято».
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || t."studentId" || '-first-page', t."studentId", 'first-page', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "studentId" FROM "Task" WHERE status IN ('SUBMITTED', 'ACCEPTED')) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Первая неделя: есть сдача задания недели.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || w."studentId" || '-first-week', w."studentId", 'first-week', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "studentId" FROM "WeeklySubmission") w
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Первая глава: статус главы «принята».
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || c."studentId" || '-first-chapter', c."studentId", 'first-chapter', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT b."studentId"
  FROM "PlanChapter" ch
  JOIN "Book" b ON b.id = ch."bookId"
  WHERE ch."reviewStatus" = 'ACCEPTED'
) c
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Десять заданий: десять основных со статусом «сдано на проверку» или «принято».
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || t."studentId" || '-ten-tasks', t."studentId", 'ten-tasks', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (
  SELECT "studentId"
  FROM "Task"
  WHERE status IN ('SUBMITTED', 'ACCEPTED')
  GROUP BY "studentId"
  HAVING COUNT(*) >= 10
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Книга закончена: в журнале звёзд есть завершение книги.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || s."studentId" || '-book-done', s."studentId", 'book-done', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "StarAward"
  WHERE direction = 'EARN'
    AND ("sourceId" = 'book-complete' OR note = 'завершение книги')
) s
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Первая заявка: конкурс со статусом «отправлено».
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || s."studentId" || '-first-entry', s."studentId", 'first-entry', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "studentId" FROM "Submission" WHERE type = 'CONTEST' AND status = 'SENT') s
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Первый отказ: конкурс со статусом «отклонено».
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || s."studentId" || '-first-no', s."studentId", 'first-no', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "studentId" FROM "Submission" WHERE type = 'CONTEST' AND status = 'REJECTED') s
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Принято: конкурс со статусом «принято».
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || s."studentId" || '-contest-yes', s."studentId", 'contest-yes', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "studentId" FROM "Submission" WHERE type = 'CONTEST' AND status = 'ACCEPTED') s
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- В издательстве: заявка в издательство ушла (любой статус, кроме «не отправлено»).
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || s."studentId" || '-publisher', s."studentId", 'publisher', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "studentId" FROM "Submission" WHERE type = 'PUBLISHER' AND status <> 'NOT_SENT') s
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Огонёк, Свеча, Маяк: лучшая серия 4, 8 и 12 недель.
-- Здесь серия — это подряд идущие засчитанные недели, как в бонусе звёзд.
-- Каникулы на сайте серию не рвут. Этот файл их мостом не считает:
-- если мост дотягивает серию до значка, сайт допишет его при следующей сдаче.
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
)
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || b."studentId" || '-' || m.badge,
  b."studentId",
  m.badge,
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM best b
JOIN (
  VALUES (4, 'spark'), (8, 'candle'), (12, 'lighthouse')
) AS m(len, badge) ON b.best >= m.len
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Снова в строю: между двумя засчитанными неделями три или больше недель не в каникулах.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT 'bf-badge-' || g."studentId" || '-back-in-line', g."studentId", 'back-in-line', 'AUTO'::"BadgeSource", CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT o."studentId"
  FROM (
    SELECT
      "studentId",
      "weekStart",
      LAG("weekStart") OVER (PARTITION BY "studentId" ORDER BY "weekStart") AS prev
    FROM "StreakWeek"
  ) o
  WHERE o.prev IS NOT NULL
    AND ((o."weekStart" - o.prev) / 7) - 1 - (
      SELECT COUNT(*)::int
      FROM "StreakVacation" v
      WHERE v."studentId" = o."studentId"
        AND v."weekStart" > o.prev
        AND v."weekStart" < o."weekStart"
    ) >= 3
) g
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Уровни по сумме «заработано».
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || e."studentId" || '-' || m.badge,
  e."studentId",
  m.badge,
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT "studentId", SUM(points)::int AS earned
  FROM "StarAward"
  WHERE direction = 'EARN'
  GROUP BY "studentId"
) e
JOIN (
  VALUES (5, 'level-5'), (25, 'level-25'), (70, 'level-70'), (100, 'level-100'), (150, 'level-150')
) AS m(need, badge) ON e.earned >= m.need
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Практик: принято задание по методичке 1.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-1',
  t."studentId",
  'methodical-1',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^1([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+1([[:space:].]|$)'
      OR title ILIKE '%писательская практика%'
      OR title ILIKE '%Писательская практика%')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Луковица: принято задание по методичке 2.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-2',
  t."studentId",
  'methodical-2',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^2([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+2([[:space:].]|$)'
      OR title ILIKE '%луковица%'
      OR title ILIKE '%Луковица%')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Арка героя: принято задание по методичке 3.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-3',
  t."studentId",
  'methodical-3',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^3([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+3([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Свита: принято задание по методичке 4.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-4',
  t."studentId",
  'methodical-4',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^4([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+4([[:space:].]|$)'
      OR title ILIKE '%второстепенные%'
      OR title ILIKE '%Второстепенные%')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Сеттинг: принято задание по методичке 5.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-5',
  t."studentId",
  'methodical-5',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^5([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+5([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Знаток жанров: принято задание по методичке 6.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-6',
  t."studentId",
  'methodical-6',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^6([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+6([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Структура. Часть 1: принято задание по методичке 7-1.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-7-1',
  t."studentId",
  'methodical-7-1',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^7-1([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+7-1([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Структура. Часть 2: принято задание по методичке 7-2.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-7-2',
  t."studentId",
  'methodical-7-2',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^7-2([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+7-2([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Высказывание: принято задание по методичке 8.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-8',
  t."studentId",
  'methodical-8',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^8([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+8([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Драматург: принято задание по методичке 9.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-9',
  t."studentId",
  'methodical-9',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^9([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+9([[:space:].]|$)'
      OR title ILIKE '%драмаргумент%'
      OR title ILIKE '%Драмаргумент%')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Крючок: принято задание по методичке 10.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-10',
  t."studentId",
  'methodical-10',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^10([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+10([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Стиль: принято задание по методичке 11.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-11',
  t."studentId",
  'methodical-11',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^11([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+11([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Короткая форма: принято задание по методичке 12.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-12',
  t."studentId",
  'methodical-12',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^12([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+12([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Большая идея: принято задание по методичке 13.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-13',
  t."studentId",
  'methodical-13',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^13([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+13([[:space:].]|$)'
      OR title ILIKE '%хай-концепт%'
      OR title ILIKE '%Хай-концепт%')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Одна строка: принято задание по методичке 14.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-14',
  t."studentId",
  'methodical-14',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^14([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+14([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Аннотация: принято задание по методичке 15.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-15',
  t."studentId",
  'methodical-15',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^15([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+15([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Синопсис: принято задание по методичке 16.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-16',
  t."studentId",
  'methodical-16',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^16([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+16([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Публикация: принято задание по методичке 17.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-17',
  t."studentId",
  'methodical-17',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^17([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+17([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Своё имя: принято задание по методичке 18.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-18',
  t."studentId",
  'methodical-18',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^18([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+18([[:space:].]|$)'
      OR title ILIKE '%личный бренд%'
      OR title ILIKE '%Личный бренд%')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Строитель миров: принято задание по методичке 19-1.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-19-1',
  t."studentId",
  'methodical-19-1',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^19-1([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+19-1([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;

-- Хранитель мира: принято задание по методичке 19-2.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || 'methodical-19-2',
  t."studentId",
  'methodical-19-2',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (title ~ '^19-2([[:space:].]|$)'
      OR title ~ '(м|М)етодичка[[:space:]]+19-2([[:space:].]|$)')
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;
