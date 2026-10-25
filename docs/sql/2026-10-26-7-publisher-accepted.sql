-- Значок «Контракт»: заявка в издательство со статусом «принято».
-- Журнал остаётся конкурсом, отдельного типа в трекере нет.
-- «Публикация» — это прежний значок contest-yes. Меняется название и подсказка.
-- На сайте у всех учеников одна форма «Вы»: колонка hint совпадает с hintFormal.
-- Повторный запуск не добавляет вторую выдачу и не трогает уже выданные строки.

INSERT INTO "Badge" (id, title, hint, "hintFormal", section, image, "sortOrder")
VALUES (
  'publisher-yes',
  'Контракт',
  'Получите контракт с издательством.',
  'Получите контракт с издательством.',
  'contest',
  '/badges/publisher-yes.png',
  204
)
ON CONFLICT (id) DO NOTHING;

UPDATE "Badge"
SET
  title = 'Контракт',
  hint = 'Получите контракт с издательством.',
  "hintFormal" = 'Получите контракт с издательством.'
WHERE id = 'publisher-yes'
  AND (
    title IS DISTINCT FROM 'Контракт'
    OR hint IS DISTINCT FROM 'Получите контракт с издательством.'
    OR "hintFormal" IS DISTINCT FROM 'Получите контракт с издательством.'
  );

UPDATE "Badge"
SET
  title = 'Публикация',
  hint = 'Получите публикацию в журнале или победу на конкурсе.',
  "hintFormal" = 'Получите публикацию в журнале или победу на конкурсе.'
WHERE id = 'contest-yes'
  AND (
    title IS DISTINCT FROM 'Публикация'
    OR hint IS DISTINCT FROM 'Получите публикацию в журнале или победу на конкурсе.'
    OR "hintFormal" IS DISTINCT FROM 'Получите публикацию в журнале или победу на конкурсе.'
  );

-- Уже загруженный справочник хранит «ты» в hint и «Вы» в hintFormal.
-- Новые методички, заведённые в библиотеке, тоже.
UPDATE "Badge"
SET hint = "hintFormal"
WHERE hint IS DISTINCT FROM "hintFormal";

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
