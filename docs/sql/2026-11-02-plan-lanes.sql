-- План книги: ветки и события. Трекер (PlanChapter) не меняется.
-- Старые StorylineBlock не удаляются и не переписываются: строки копируются.
-- Повторный запуск ничего не затирает: свои id и sourceBlockId уже на месте.
-- Нужно отдельное одобрение, прежде чем деплой применит файл.

CREATE TABLE IF NOT EXISTS "Storyline" (
  id TEXT PRIMARY KEY,
  "bookId" TEXT NOT NULL REFERENCES "Book"(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#2FB083',
  note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS "Storyline_bookId_idx" ON "Storyline"("bookId");

CREATE TABLE IF NOT EXISTS "PlanCard" (
  id TEXT PRIMARY KEY,
  "bookId" TEXT NOT NULL REFERENCES "Book"(id) ON DELETE CASCADE,
  "storylineId" TEXT NOT NULL REFERENCES "Storyline"(id) ON DELETE CASCADE,
  "actId" TEXT REFERENCES "Act"(id) ON DELETE SET NULL,
  "planChapterId" TEXT REFERENCES "PlanChapter"(id) ON DELETE SET NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  "sourceBlockId" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlanCard_sourceBlockId_key" ON "PlanCard"("sourceBlockId");
CREATE INDEX IF NOT EXISTS "PlanCard_bookId_idx" ON "PlanCard"("bookId");
CREATE INDEX IF NOT EXISTS "PlanCard_storylineId_idx" ON "PlanCard"("storylineId");
CREATE INDEX IF NOT EXISTS "PlanCard_actId_idx" ON "PlanCard"("actId");
CREATE INDEX IF NOT EXISTS "PlanCard_planChapterId_idx" ON "PlanCard"("planChapterId");

-- Ветка: одно имя и цвет внутри книги. Пустое имя не склеиваем с чужими.
INSERT INTO "Storyline" (id, "bookId", "order", name, color, note)
SELECT src.id, src."bookId", src."order", src.name, src.color, ''
FROM (
  SELECT
    'sl_' || md5(g."bookId" || '|' || g.color || '|' || g.key) AS id,
    g."bookId",
    (row_number() OVER (PARTITION BY g."bookId" ORDER BY g.min_order, g.name)) - 1 AS "order",
    g.name,
    g.color
  FROM (
    SELECT
      b.book_id AS "bookId",
      CASE
        WHEN lower(btrim(b.color)) = 'sage' THEN '#2FB083'
        WHEN lower(btrim(b.color)) = 'lavender' THEN '#7B6CF6'
        WHEN lower(btrim(b.color)) = 'ochre' THEN '#F28A3C'
        WHEN lower(btrim(b.color)) = 'blue' THEN '#3B9EDB'
        WHEN lower(btrim(b.color)) = 'pink' THEN '#E0528A'
        WHEN b.color ~ '^#[0-9A-Fa-f]{6}$' THEN b.color
        ELSE '#2FB083'
      END AS color,
      CASE
        WHEN btrim(coalesce(b.name, '')) = '' THEN 'Линия'
        ELSE left(btrim(b.name), 200)
      END AS name,
      CASE
        WHEN btrim(coalesce(b.name, '')) = '' THEN 'id:' || b.id
        ELSE lower(btrim(b.name))
      END AS key,
      min(b."order") AS min_order
    FROM (
      SELECT
        sb.id,
        sb.name,
        sb.color,
        sb."order",
        COALESCE(pc."bookId", act."bookId") AS book_id
      FROM "StorylineBlock" sb
      LEFT JOIN "PlanChapter" pc ON pc.id = sb."planChapterId"
      LEFT JOIN "ActChapter" ach ON ach.id = sb."chapterId"
      LEFT JOIN "Act" act ON act.id = ach."actId"
    ) b
    WHERE b.book_id IS NOT NULL
    GROUP BY b.book_id, 2, 3, 4
  ) g
) src
WHERE NOT EXISTS (SELECT 1 FROM "Storyline" s WHERE s.id = src.id);

-- Событие: название из первой строки описания, текст целиком в теле.
-- sourceBlockId не даёт скопировать одну сцену дважды.
INSERT INTO "PlanCard" (id, "bookId", "storylineId", "actId", "planChapterId", "order", title, body, "sourceBlockId")
SELECT
  'pc_' || b.id,
  b.book_id,
  'sl_' || md5(b.book_id || '|' || b.color || '|' || b.key),
  b.act_id,
  b."planChapterId",
  b."order",
  b.title,
  b.body,
  b.id
FROM (
  SELECT
    sb.id,
    sb."order",
    sb."planChapterId",
    COALESCE(pc."bookId", act."bookId") AS book_id,
    COALESCE(pc."actId", ach."actId") AS act_id,
    CASE
      WHEN lower(btrim(sb.color)) = 'sage' THEN '#2FB083'
      WHEN lower(btrim(sb.color)) = 'lavender' THEN '#7B6CF6'
      WHEN lower(btrim(sb.color)) = 'ochre' THEN '#F28A3C'
      WHEN lower(btrim(sb.color)) = 'blue' THEN '#3B9EDB'
      WHEN lower(btrim(sb.color)) = 'pink' THEN '#E0528A'
      WHEN sb.color ~ '^#[0-9A-Fa-f]{6}$' THEN sb.color
      ELSE '#2FB083'
    END AS color,
    CASE
      WHEN btrim(coalesce(sb.name, '')) = '' THEN 'id:' || sb.id
      ELSE lower(btrim(sb.name))
    END AS key,
    CASE
      WHEN btrim(coalesce(sb.description, '')) = '' THEN 'Событие'
      ELSE left(split_part(sb.description, E'\n', 1), 200)
    END AS title,
    coalesce(sb.description, '') AS body
  FROM "StorylineBlock" sb
  LEFT JOIN "PlanChapter" pc ON pc.id = sb."planChapterId"
  LEFT JOIN "ActChapter" ach ON ach.id = sb."chapterId"
  LEFT JOIN "Act" act ON act.id = ach."actId"
) b
WHERE b.book_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "PlanCard" c WHERE c."sourceBlockId" = b.id);
