-- Справочник значков и таблица, кому он выдан.
-- Ключевые методички 1…19-2 заведены сразу. Новая методичка получает значок из приложения.
-- Повторный запуск не стирает выдачу и не переписывает уже привязанную методичку.

DO $$
BEGIN
  CREATE TYPE "BadgeSource" AS ENUM ('AUTO', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Badge" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  hint TEXT NOT NULL,
  "hintFormal" TEXT NOT NULL,
  section TEXT NOT NULL,
  image TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "guideId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Badge_guideId_key" ON "Badge" ("guideId");

CREATE TABLE IF NOT EXISTS "BadgeAward" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "badgeId" TEXT NOT NULL,
  source "BadgeSource" NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "awardedById" TEXT,
  "revokedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "BadgeAward_studentId_badgeId_key"
  ON "BadgeAward" ("studentId", "badgeId");
CREATE INDEX IF NOT EXISTS "BadgeAward_studentId_idx" ON "BadgeAward" ("studentId");

DO $$
BEGIN
  ALTER TABLE "Badge"
    ADD CONSTRAINT "Badge_guideId_fkey"
    FOREIGN KEY ("guideId") REFERENCES "Guide"(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "BadgeAward"
    ADD CONSTRAINT "BadgeAward_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "BadgeAward"
    ADD CONSTRAINT "BadgeAward_badgeId_fkey"
    FOREIGN KEY ("badgeId") REFERENCES "Badge"(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "Badge" (id, title, hint, "hintFormal", section, image, "sortOrder")
VALUES
  ('first-page', 'Первая страница', 'Сдай первое основное задание.', 'Сдайте первое основное задание.', 'start', '/badges/first-page.png', 10),
  ('first-week', 'Первая неделя', 'Сдай первое задание недели.', 'Сдайте первое задание недели.', 'start', '/badges/first-week.png', 11),
  ('first-chapter', 'Первая глава', 'Дождись статуса «принята» у первой главы.', 'Дождитесь статуса «принята» у первой главы.', 'start', '/badges/first-chapter.png', 12),
  ('ten-tasks', 'Десять заданий', 'Сдай 10 основных заданий.', 'Сдайте 10 основных заданий.', 'practice', '/badges/ten-tasks.png', 40),
  ('ten-thousand', '10 000 знаков', 'Текст от 10 000 знаков. Значок ставит Лиза.', 'Текст от 10 000 знаков. Значок ставит Лиза.', 'practice', '/badges/ten-thousand.png', 41),
  ('second-draft', 'Вторая редакция', 'Текст переписан после разбора. Значок ставит Лиза.', 'Текст переписан после разбора. Значок ставит Лиза.', 'practice', '/badges/second-draft.png', 42),
  ('book-done', 'Книга закончена', 'Заверши книгу: в журнале звёзд есть «завершение книги».', 'Завершите книгу: в журнале звёзд есть «завершение книги».', 'practice', '/badges/book-done.png', 43),
  ('methodical-1', 'Практик', 'Прими задание по методичке «1 Писательская практика».', 'Примите задание по методичке «1 Писательская практика».', 'methodical', '/badges/methodical-1.png', 100),
  ('methodical-2', 'Луковица', 'Прими задание по методичке «2 Луковица».', 'Примите задание по методичке «2 Луковица».', 'methodical', '/badges/methodical-2.png', 101),
  ('methodical-3', 'Арка героя', 'Прими задание по методичке «3 Арка».', 'Примите задание по методичке «3 Арка».', 'methodical', '/badges/methodical-3.png', 102),
  ('methodical-4', 'Свита', 'Прими задание по методичке «4 Второстепенные».', 'Примите задание по методичке «4 Второстепенные».', 'methodical', '/badges/methodical-4.png', 103),
  ('methodical-5', 'Сеттинг', 'Прими задание по методичке «5 Сеттинги».', 'Примите задание по методичке «5 Сеттинги».', 'methodical', '/badges/methodical-5.png', 104),
  ('methodical-6', 'Знаток жанров', 'Прими задание по методичке «6 Жанр, тропы, клише».', 'Примите задание по методичке «6 Жанр, тропы, клише».', 'methodical', '/badges/methodical-6.png', 105),
  ('methodical-7-1', 'Структура. Часть 1', 'Прими задание по методичке «7-1 Сценарные структуры».', 'Примите задание по методичке «7-1 Сценарные структуры».', 'methodical', '/badges/methodical-7-1.png', 106),
  ('methodical-7-2', 'Структура. Часть 2', 'Прими задание по методичке «7-2 Сценарные структуры».', 'Примите задание по методичке «7-2 Сценарные структуры».', 'methodical', '/badges/methodical-7-2.png', 107),
  ('methodical-8', 'Высказывание', 'Прими задание по методичке «8 Высказывание».', 'Примите задание по методичке «8 Высказывание».', 'methodical', '/badges/methodical-8.png', 108),
  ('methodical-9', 'Драматург', 'Прими задание по методичке «9 Драмаргумент».', 'Примите задание по методичке «9 Драмаргумент».', 'methodical', '/badges/methodical-9.png', 109),
  ('methodical-10', 'Крючок', 'Прими задание по методичке «10 Крючки».', 'Примите задание по методичке «10 Крючки».', 'methodical', '/badges/methodical-10.png', 110),
  ('methodical-11', 'Стиль', 'Прими задание по методичке «11 Стиль».', 'Примите задание по методичке «11 Стиль».', 'methodical', '/badges/methodical-11.png', 111),
  ('methodical-12', 'Короткая форма', 'Прими задание по методичке «12 Рассказ».', 'Примите задание по методичке «12 Рассказ».', 'methodical', '/badges/methodical-12.png', 112),
  ('methodical-13', 'Большая идея', 'Прими задание по методичке «13 Хай-концепт».', 'Примите задание по методичке «13 Хай-концепт».', 'methodical', '/badges/methodical-13.png', 113),
  ('methodical-14', 'Одна строка', 'Прими задание по методичке «14 Логлайн».', 'Примите задание по методичке «14 Логлайн».', 'methodical', '/badges/methodical-14.png', 114),
  ('methodical-15', 'Аннотация', 'Прими задание по методичке «15 Аннотация».', 'Примите задание по методичке «15 Аннотация».', 'methodical', '/badges/methodical-15.png', 115),
  ('methodical-16', 'Синопсис', 'Прими задание по методичке «16 Синопсис».', 'Примите задание по методичке «16 Синопсис».', 'methodical', '/badges/methodical-16.png', 116),
  ('methodical-17', 'Публикация', 'Прими задание по методичке «17 Публикация».', 'Примите задание по методичке «17 Публикация».', 'methodical', '/badges/methodical-17.png', 117),
  ('methodical-18', 'Своё имя', 'Прими задание по методичке «18 Личный бренд».', 'Примите задание по методичке «18 Личный бренд».', 'methodical', '/badges/methodical-18.png', 118),
  ('methodical-19-1', 'Строитель миров', 'Прими задание по методичке «19-1 Библия мира».', 'Примите задание по методичке «19-1 Библия мира».', 'methodical', '/badges/methodical-19-1.png', 119),
  ('methodical-19-2', 'Хранитель мира', 'Прими задание по методичке «19-2 Библия мира».', 'Примите задание по методичке «19-2 Библия мира».', 'methodical', '/badges/methodical-19-2.png', 120),
  ('first-entry', 'Первая заявка', 'Отправь первую заявку на конкурс.', 'Отправьте первую заявку на конкурс.', 'contest', '/badges/first-entry.png', 200),
  ('first-no', 'Первый отказ', 'Получи первый отказ с конкурса. Отказ — часть пути.', 'Получите первый отказ с конкурса. Отказ — часть пути.', 'contest', '/badges/first-no.png', 201),
  ('contest-yes', 'Принято', 'Дождись статуса «принято» на конкурсе.', 'Дождитесь статуса «принято» на конкурсе.', 'contest', '/badges/contest-yes.png', 202),
  ('publisher', 'В издательстве', 'Отправь первую заявку в издательство.', 'Отправьте первую заявку в издательство.', 'contest', '/badges/publisher.png', 203),
  ('spark', 'Огонёк', 'Держи серию 4 недели подряд.', 'Держите серию 4 недели подряд.', 'streak', '/badges/spark.png', 230),
  ('candle', 'Свеча', 'Держи серию 8 недель подряд.', 'Держите серию 8 недель подряд.', 'streak', '/badges/candle.png', 231),
  ('lighthouse', 'Маяк', 'Держи серию 12 недель подряд.', 'Держите серию 12 недель подряд.', 'streak', '/badges/lighthouse.png', 232),
  ('back-in-line', 'Снова в строю', 'Сдай задание или главу после перерыва от трёх недель.', 'Сдайте задание или главу после перерыва от трёх недель.', 'streak', '/badges/back-in-line.png', 233),
  ('level-5', 'Сочинитель', 'Набери 5 звёзд в «заработано» — статус «Сочинитель».', 'Наберите 5 звёзд в «заработано» — статус «Сочинитель».', 'level', '/badges/level-5.png', 260),
  ('level-25', 'Рассказчик', 'Набери 25 звёзд в «заработано» — статус «Рассказчик».', 'Наберите 25 звёзд в «заработано» — статус «Рассказчик».', 'level', '/badges/level-25.png', 261),
  ('level-70', 'Романист', 'Набери 70 звёзд в «заработано» — статус «Романист».', 'Наберите 70 звёзд в «заработано» — статус «Романист».', 'level', '/badges/level-70.png', 262),
  ('level-100', 'Достоевский', 'Набери 100 звёзд в «заработано» — статус «Достоевский».', 'Наберите 100 звёзд в «заработано» — статус «Достоевский».', 'level', '/badges/level-100.png', 263),
  ('level-150', 'Живой классик', 'Набери 150 звёзд в «заработано» — статус «Живой классик».', 'Наберите 150 звёзд в «заработано» — статус «Живой классик».', 'level', '/badges/level-150.png', 264)
ON CONFLICT (id) DO NOTHING;

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-1'
  AND b."guideId" IS NULL
  AND (g.title ~ '^1([[:space:].]|$)'
    OR g.title ILIKE '%писательская практика%'
    OR g.title ILIKE '%Писательская практика%');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-2'
  AND b."guideId" IS NULL
  AND (g.title ~ '^2([[:space:].]|$)'
    OR g.title ILIKE '%луковица%'
    OR g.title ILIKE '%Луковица%');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-3'
  AND b."guideId" IS NULL
  AND (g.title ~ '^3([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-4'
  AND b."guideId" IS NULL
  AND (g.title ~ '^4([[:space:].]|$)'
    OR g.title ILIKE '%второстепенные%'
    OR g.title ILIKE '%Второстепенные%');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-5'
  AND b."guideId" IS NULL
  AND (g.title ~ '^5([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-6'
  AND b."guideId" IS NULL
  AND (g.title ~ '^6([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-7-1'
  AND b."guideId" IS NULL
  AND (g.title ~ '^7-1([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-7-2'
  AND b."guideId" IS NULL
  AND (g.title ~ '^7-2([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-8'
  AND b."guideId" IS NULL
  AND (g.title ~ '^8([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-9'
  AND b."guideId" IS NULL
  AND (g.title ~ '^9([[:space:].]|$)'
    OR g.title ILIKE '%драмаргумент%'
    OR g.title ILIKE '%Драмаргумент%');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-10'
  AND b."guideId" IS NULL
  AND (g.title ~ '^10([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-11'
  AND b."guideId" IS NULL
  AND (g.title ~ '^11([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-12'
  AND b."guideId" IS NULL
  AND (g.title ~ '^12([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-13'
  AND b."guideId" IS NULL
  AND (g.title ~ '^13([[:space:].]|$)'
    OR g.title ILIKE '%хай-концепт%'
    OR g.title ILIKE '%Хай-концепт%');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-14'
  AND b."guideId" IS NULL
  AND (g.title ~ '^14([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-15'
  AND b."guideId" IS NULL
  AND (g.title ~ '^15([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-16'
  AND b."guideId" IS NULL
  AND (g.title ~ '^16([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-17'
  AND b."guideId" IS NULL
  AND (g.title ~ '^17([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-18'
  AND b."guideId" IS NULL
  AND (g.title ~ '^18([[:space:].]|$)'
    OR g.title ILIKE '%личный бренд%'
    OR g.title ILIKE '%Личный бренд%');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-19-1'
  AND b."guideId" IS NULL
  AND (g.title ~ '^19-1([[:space:].]|$)');

UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = 'methodical-19-2'
  AND b."guideId" IS NULL
  AND (g.title ~ '^19-2([[:space:].]|$)');
