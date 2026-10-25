-- 3 звезды за главу со статусом «принята». Одна строка на главу.
-- Другие статусы не получают звёзд. Уже существующая строка не меняется.
-- Повторный запуск безопасен.

INSERT INTO "StarAward" ("id", "studentId", "kind", "points", "sourceId", "note", "direction", "createdAt")
SELECT
  'bf-chapter-' || c."id",
  b."studentId",
  'CHAPTER'::"StarKind",
  3,
  c."id",
  '',
  'EARN'::"StarDirection",
  CURRENT_TIMESTAMP
FROM "PlanChapter" c
JOIN "Book" b ON b."id" = c."bookId"
WHERE c."reviewStatus" = 'ACCEPTED'
ON CONFLICT ("studentId", "kind", "sourceId") DO NOTHING;
