-- Очередь цитаты дня: меньше Льосы и Найпола, авторы не ближе семи дней.
-- Одиннадцать строк остаются в таблице и выходят из очереди: столбец active.
-- sortOrder записан заранее. Поиск по авторам здесь не выполняется.
-- Якорь 26 октября 2026 меняется с quote-004 на Найпола. Позже записанный якорь не трогается.
-- Повторный запуск безопасен. Письма не отправляются.

ALTER TABLE "DailyQuote" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "DailyQuote" SET "active" = false
WHERE "id" IN (
  'quote-083',
  'quote-086',
  'quote-088',
  'quote-090',
  'quote-091',
  'quote-092',
  'quote-095',
  'quote-097',
  'quote-100',
  'quote-121',
  'quote-122'
);

UPDATE "DailyQuote" SET "sortOrder" = 1 WHERE "id" = 'quote-093';
UPDATE "DailyQuote" SET "sortOrder" = 2 WHERE "id" = 'quote-109';
UPDATE "DailyQuote" SET "sortOrder" = 3 WHERE "id" = 'quote-119';
UPDATE "DailyQuote" SET "sortOrder" = 4 WHERE "id" = 'quote-120';
UPDATE "DailyQuote" SET "sortOrder" = 5 WHERE "id" = 'quote-071';
UPDATE "DailyQuote" SET "sortOrder" = 6 WHERE "id" = 'quote-105';
UPDATE "DailyQuote" SET "sortOrder" = 7 WHERE "id" = 'quote-064';
UPDATE "DailyQuote" SET "sortOrder" = 8 WHERE "id" = 'quote-112';
UPDATE "DailyQuote" SET "sortOrder" = 9 WHERE "id" = 'quote-003';
UPDATE "DailyQuote" SET "sortOrder" = 10 WHERE "id" = 'quote-027';
UPDATE "DailyQuote" SET "sortOrder" = 11 WHERE "id" = 'quote-052';
UPDATE "DailyQuote" SET "sortOrder" = 12 WHERE "id" = 'quote-044';
UPDATE "DailyQuote" SET "sortOrder" = 13 WHERE "id" = 'quote-062';
UPDATE "DailyQuote" SET "sortOrder" = 14 WHERE "id" = 'quote-073';
UPDATE "DailyQuote" SET "sortOrder" = 15 WHERE "id" = 'quote-076';
UPDATE "DailyQuote" SET "sortOrder" = 16 WHERE "id" = 'quote-019';
UPDATE "DailyQuote" SET "sortOrder" = 17 WHERE "id" = 'quote-107';
UPDATE "DailyQuote" SET "sortOrder" = 18 WHERE "id" = 'quote-004';
UPDATE "DailyQuote" SET "sortOrder" = 19 WHERE "id" = 'quote-113';
UPDATE "DailyQuote" SET "sortOrder" = 20 WHERE "id" = 'quote-056';
UPDATE "DailyQuote" SET "sortOrder" = 21 WHERE "id" = 'quote-106';
UPDATE "DailyQuote" SET "sortOrder" = 22 WHERE "id" = 'quote-028';
UPDATE "DailyQuote" SET "sortOrder" = 23 WHERE "id" = 'quote-081';
UPDATE "DailyQuote" SET "sortOrder" = 24 WHERE "id" = 'quote-070';
UPDATE "DailyQuote" SET "sortOrder" = 25 WHERE "id" = 'quote-048';
UPDATE "DailyQuote" SET "sortOrder" = 26 WHERE "id" = 'quote-045';
UPDATE "DailyQuote" SET "sortOrder" = 27 WHERE "id" = 'quote-005';
UPDATE "DailyQuote" SET "sortOrder" = 28 WHERE "id" = 'quote-108';
UPDATE "DailyQuote" SET "sortOrder" = 29 WHERE "id" = 'quote-077';
UPDATE "DailyQuote" SET "sortOrder" = 30 WHERE "id" = 'quote-053';
UPDATE "DailyQuote" SET "sortOrder" = 31 WHERE "id" = 'quote-001';
UPDATE "DailyQuote" SET "sortOrder" = 32 WHERE "id" = 'quote-020';
UPDATE "DailyQuote" SET "sortOrder" = 33 WHERE "id" = 'quote-114';
UPDATE "DailyQuote" SET "sortOrder" = 34 WHERE "id" = 'quote-029';
UPDATE "DailyQuote" SET "sortOrder" = 35 WHERE "id" = 'quote-018';
UPDATE "DailyQuote" SET "sortOrder" = 36 WHERE "id" = 'quote-006';
UPDATE "DailyQuote" SET "sortOrder" = 37 WHERE "id" = 'quote-082';
UPDATE "DailyQuote" SET "sortOrder" = 38 WHERE "id" = 'quote-057';
UPDATE "DailyQuote" SET "sortOrder" = 39 WHERE "id" = 'quote-110';
UPDATE "DailyQuote" SET "sortOrder" = 40 WHERE "id" = 'quote-074';
UPDATE "DailyQuote" SET "sortOrder" = 41 WHERE "id" = 'quote-038';
UPDATE "DailyQuote" SET "sortOrder" = 42 WHERE "id" = 'quote-065';
UPDATE "DailyQuote" SET "sortOrder" = 43 WHERE "id" = 'quote-078';
UPDATE "DailyQuote" SET "sortOrder" = 44 WHERE "id" = 'quote-094';
UPDATE "DailyQuote" SET "sortOrder" = 45 WHERE "id" = 'quote-007';
UPDATE "DailyQuote" SET "sortOrder" = 46 WHERE "id" = 'quote-030';
UPDATE "DailyQuote" SET "sortOrder" = 47 WHERE "id" = 'quote-115';
UPDATE "DailyQuote" SET "sortOrder" = 48 WHERE "id" = 'quote-021';
UPDATE "DailyQuote" SET "sortOrder" = 49 WHERE "id" = 'quote-036';
UPDATE "DailyQuote" SET "sortOrder" = 50 WHERE "id" = 'quote-111';
UPDATE "DailyQuote" SET "sortOrder" = 51 WHERE "id" = 'quote-084';
UPDATE "DailyQuote" SET "sortOrder" = 52 WHERE "id" = 'quote-096';
UPDATE "DailyQuote" SET "sortOrder" = 53 WHERE "id" = 'quote-015';
UPDATE "DailyQuote" SET "sortOrder" = 54 WHERE "id" = 'quote-008';
UPDATE "DailyQuote" SET "sortOrder" = 55 WHERE "id" = 'quote-039';
UPDATE "DailyQuote" SET "sortOrder" = 56 WHERE "id" = 'quote-058';
UPDATE "DailyQuote" SET "sortOrder" = 57 WHERE "id" = 'quote-079';
UPDATE "DailyQuote" SET "sortOrder" = 58 WHERE "id" = 'quote-031';
UPDATE "DailyQuote" SET "sortOrder" = 59 WHERE "id" = 'quote-102';
UPDATE "DailyQuote" SET "sortOrder" = 60 WHERE "id" = 'quote-098';
UPDATE "DailyQuote" SET "sortOrder" = 61 WHERE "id" = 'quote-116';
UPDATE "DailyQuote" SET "sortOrder" = 62 WHERE "id" = 'quote-063';
UPDATE "DailyQuote" SET "sortOrder" = 63 WHERE "id" = 'quote-009';
UPDATE "DailyQuote" SET "sortOrder" = 64 WHERE "id" = 'quote-022';
UPDATE "DailyQuote" SET "sortOrder" = 65 WHERE "id" = 'quote-085';
UPDATE "DailyQuote" SET "sortOrder" = 66 WHERE "id" = 'quote-075';
UPDATE "DailyQuote" SET "sortOrder" = 67 WHERE "id" = 'quote-049';
UPDATE "DailyQuote" SET "sortOrder" = 68 WHERE "id" = 'quote-099';
UPDATE "DailyQuote" SET "sortOrder" = 69 WHERE "id" = 'quote-040';
UPDATE "DailyQuote" SET "sortOrder" = 70 WHERE "id" = 'quote-032';
UPDATE "DailyQuote" SET "sortOrder" = 71 WHERE "id" = 'quote-080';
UPDATE "DailyQuote" SET "sortOrder" = 72 WHERE "id" = 'quote-010';
UPDATE "DailyQuote" SET "sortOrder" = 73 WHERE "id" = 'quote-066';
UPDATE "DailyQuote" SET "sortOrder" = 74 WHERE "id" = 'quote-059';
UPDATE "DailyQuote" SET "sortOrder" = 75 WHERE "id" = 'quote-117';
UPDATE "DailyQuote" SET "sortOrder" = 76 WHERE "id" = 'quote-101';
UPDATE "DailyQuote" SET "sortOrder" = 77 WHERE "id" = 'quote-068';
UPDATE "DailyQuote" SET "sortOrder" = 78 WHERE "id" = 'quote-016';
UPDATE "DailyQuote" SET "sortOrder" = 79 WHERE "id" = 'quote-087';
UPDATE "DailyQuote" SET "sortOrder" = 80 WHERE "id" = 'quote-023';
UPDATE "DailyQuote" SET "sortOrder" = 81 WHERE "id" = 'quote-011';
UPDATE "DailyQuote" SET "sortOrder" = 82 WHERE "id" = 'quote-033';
UPDATE "DailyQuote" SET "sortOrder" = 83 WHERE "id" = 'quote-041';
UPDATE "DailyQuote" SET "sortOrder" = 84 WHERE "id" = 'quote-103';
UPDATE "DailyQuote" SET "sortOrder" = 85 WHERE "id" = 'quote-124';
UPDATE "DailyQuote" SET "sortOrder" = 86 WHERE "id" = 'quote-050';
UPDATE "DailyQuote" SET "sortOrder" = 87 WHERE "id" = 'quote-002';
UPDATE "DailyQuote" SET "sortOrder" = 88 WHERE "id" = 'quote-047';
UPDATE "DailyQuote" SET "sortOrder" = 89 WHERE "id" = 'quote-118';
UPDATE "DailyQuote" SET "sortOrder" = 90 WHERE "id" = 'quote-012';
UPDATE "DailyQuote" SET "sortOrder" = 91 WHERE "id" = 'quote-026';
UPDATE "DailyQuote" SET "sortOrder" = 92 WHERE "id" = 'quote-060';
UPDATE "DailyQuote" SET "sortOrder" = 93 WHERE "id" = 'quote-089';
UPDATE "DailyQuote" SET "sortOrder" = 94 WHERE "id" = 'quote-034';
UPDATE "DailyQuote" SET "sortOrder" = 95 WHERE "id" = 'quote-046';
UPDATE "DailyQuote" SET "sortOrder" = 96 WHERE "id" = 'quote-024';
UPDATE "DailyQuote" SET "sortOrder" = 97 WHERE "id" = 'quote-042';
UPDATE "DailyQuote" SET "sortOrder" = 98 WHERE "id" = 'quote-054';
UPDATE "DailyQuote" SET "sortOrder" = 99 WHERE "id" = 'quote-013';
UPDATE "DailyQuote" SET "sortOrder" = 100 WHERE "id" = 'quote-055';
UPDATE "DailyQuote" SET "sortOrder" = 101 WHERE "id" = 'quote-072';
UPDATE "DailyQuote" SET "sortOrder" = 102 WHERE "id" = 'quote-037';
UPDATE "DailyQuote" SET "sortOrder" = 103 WHERE "id" = 'quote-123';
UPDATE "DailyQuote" SET "sortOrder" = 104 WHERE "id" = 'quote-067';
UPDATE "DailyQuote" SET "sortOrder" = 105 WHERE "id" = 'quote-051';
UPDATE "DailyQuote" SET "sortOrder" = 106 WHERE "id" = 'quote-035';
UPDATE "DailyQuote" SET "sortOrder" = 107 WHERE "id" = 'quote-069';
UPDATE "DailyQuote" SET "sortOrder" = 108 WHERE "id" = 'quote-014';
UPDATE "DailyQuote" SET "sortOrder" = 109 WHERE "id" = 'quote-104';
UPDATE "DailyQuote" SET "sortOrder" = 110 WHERE "id" = 'quote-061';
UPDATE "DailyQuote" SET "sortOrder" = 111 WHERE "id" = 'quote-043';
UPDATE "DailyQuote" SET "sortOrder" = 112 WHERE "id" = 'quote-025';
UPDATE "DailyQuote" SET "sortOrder" = 113 WHERE "id" = 'quote-017';

UPDATE "DailyQuote" SET "sortOrder" = 10001 WHERE "id" = 'quote-083';
UPDATE "DailyQuote" SET "sortOrder" = 10002 WHERE "id" = 'quote-086';
UPDATE "DailyQuote" SET "sortOrder" = 10003 WHERE "id" = 'quote-088';
UPDATE "DailyQuote" SET "sortOrder" = 10004 WHERE "id" = 'quote-090';
UPDATE "DailyQuote" SET "sortOrder" = 10005 WHERE "id" = 'quote-091';
UPDATE "DailyQuote" SET "sortOrder" = 10006 WHERE "id" = 'quote-092';
UPDATE "DailyQuote" SET "sortOrder" = 10007 WHERE "id" = 'quote-095';
UPDATE "DailyQuote" SET "sortOrder" = 10008 WHERE "id" = 'quote-097';
UPDATE "DailyQuote" SET "sortOrder" = 10009 WHERE "id" = 'quote-100';
UPDATE "DailyQuote" SET "sortOrder" = 10010 WHERE "id" = 'quote-121';
UPDATE "DailyQuote" SET "sortOrder" = 10011 WHERE "id" = 'quote-122';

INSERT INTO "MailBroadcast" (
  "key", "enabled", "timeZone", "weekdays", "minute", "windowMinutes",
  "oncePerDay", "audience", "studentIds", "sender", "updatedAt"
)
SELECT
  'quote-seq', false, 'Europe/Moscow', '', 0, 0,
  false, 'all', '{"date":"2026-10-26","quoteId":"quote-093"}', 'profile', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "MailBroadcast" WHERE "key" = 'quote-seq');

UPDATE "MailBroadcast"
SET "studentIds" = '{"date":"2026-10-26","quoteId":"quote-093"}',
    "enabled" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'quote-seq'
  AND "studentIds" LIKE '%"date":"2026-10-26"%'
  AND "studentIds" LIKE '%"quoteId":"quote-004"%';

DO $check$
DECLARE
  authors text[];
  n integer;
  i integer;
  d integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "DailyQuote" WHERE "id" = 'quote-093' AND "active" IS TRUE
  ) THEN
    RAISE EXCEPTION 'в очереди нет цитаты Найпола quote-093';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "DailyQuote" WHERE "id" = 'quote-004' AND "active" IS TRUE
  ) THEN
    RAISE EXCEPTION 'в очереди нет цитаты quote-004';
  END IF;

  SELECT ARRAY(
    SELECT author
    FROM "DailyQuote"
    WHERE "active" IS TRUE
    ORDER BY "sortOrder", "id"
  ) INTO authors;
  n := COALESCE(array_length(authors, 1), 0);
  IF n = 0 THEN
    RAISE EXCEPTION 'в очереди нет цитат';
  END IF;
  FOR i IN 1..n LOOP
    FOR d IN 1..LEAST(6, n - 1) LOOP
      IF authors[i] = authors[1 + ((i - 1 + d) % n)] THEN
        RAISE EXCEPTION 'автор «%» повторяется через % дн.', authors[i], d;
      END IF;
    END LOOP;
  END LOOP;
END
$check$;
