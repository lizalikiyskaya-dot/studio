-- Значок «Принято в издательстве»: заявка в издательство со статусом «принято».
-- Журнал остаётся конкурсом, отдельного типа в трекере нет.
-- Подсказка у «Принято» говорит про конкурс и журнал. Награды учеников не меняются.
-- Повторный запуск ничего не добавляет и не переписывает уже выданную строку.

INSERT INTO "Badge" (id, title, hint, "hintFormal", section, image, "sortOrder")
VALUES (
  'publisher-yes',
  'Принято в издательстве',
  'Дождись статуса «принято» в издательстве.',
  'Дождитесь статуса «принято» в издательстве.',
  'contest',
  '/badges/publisher-yes.png',
  204
)
ON CONFLICT (id) DO NOTHING;

UPDATE "Badge"
SET
  hint = 'Дождись статуса «принято» на конкурсе или в журнале.',
  "hintFormal" = 'Дождитесь статуса «принято» на конкурсе или в журнале.'
WHERE id = 'contest-yes';

INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || s."studentId" || '-publisher-yes',
  s."studentId",
  'publisher-yes',
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Submission"
  WHERE type = 'PUBLISHER' AND status = 'ACCEPTED'
) s
ON CONFLICT ("studentId", "badgeId") DO NOTHING;
