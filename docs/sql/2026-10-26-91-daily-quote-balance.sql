-- Очередь цитаты дня: меньше Льосы и Найпола, авторы не ближе семи дней.
-- Удаляются только перечисленные строки "DailyQuote". Текст остальных не переписывается.
-- Уже снятые строки пропускаются. sortOrder считается заново по тем строкам, которые есть.
-- Якорь 26 октября 2026 меняется с quote-004 на Найпола. Позже записанный якорь не трогается.
-- Повторный запуск безопасен. Письма не отправляются.

DO $balance$
DECLARE
  n integer;
  gap integer;
  placed boolean;
  i integer;
  q integer;
  best integer;
  best_score integer;
  nearest integer;
  other integer;
  dist integer;
  achieved integer;
  author_name text;
  ids text[];
  placed_ids text[];
  today_id text;
  pin_json text;
BEGIN
  DELETE FROM "DailyQuote"
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

  CREATE TEMP TABLE quote_pref (
    id text PRIMARY KEY,
    ord integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO quote_pref (id, ord) VALUES
    ('quote-001', 1),
    ('quote-002', 2),
    ('quote-003', 3),
    ('quote-004', 4),
    ('quote-005', 5),
    ('quote-006', 6),
    ('quote-007', 7),
    ('quote-008', 8),
    ('quote-009', 9),
    ('quote-010', 10),
    ('quote-011', 11),
    ('quote-012', 12),
    ('quote-013', 13),
    ('quote-014', 14),
    ('quote-015', 15),
    ('quote-016', 16),
    ('quote-017', 17),
    ('quote-018', 18),
    ('quote-019', 19),
    ('quote-020', 20),
    ('quote-021', 21),
    ('quote-022', 22),
    ('quote-023', 23),
    ('quote-024', 24),
    ('quote-025', 25),
    ('quote-026', 26),
    ('quote-027', 27),
    ('quote-028', 28),
    ('quote-029', 29),
    ('quote-030', 30),
    ('quote-031', 31),
    ('quote-032', 32),
    ('quote-033', 33),
    ('quote-034', 34),
    ('quote-035', 35),
    ('quote-036', 36),
    ('quote-037', 37),
    ('quote-038', 38),
    ('quote-039', 39),
    ('quote-040', 40),
    ('quote-041', 41),
    ('quote-042', 42),
    ('quote-043', 43),
    ('quote-044', 44),
    ('quote-045', 45),
    ('quote-046', 46),
    ('quote-047', 47),
    ('quote-048', 48),
    ('quote-049', 49),
    ('quote-050', 50),
    ('quote-051', 51),
    ('quote-052', 52),
    ('quote-053', 53),
    ('quote-054', 54),
    ('quote-055', 55),
    ('quote-056', 56),
    ('quote-057', 57),
    ('quote-058', 58),
    ('quote-059', 59),
    ('quote-060', 60),
    ('quote-061', 61),
    ('quote-062', 62),
    ('quote-063', 63),
    ('quote-064', 64),
    ('quote-065', 65),
    ('quote-066', 66),
    ('quote-067', 67),
    ('quote-068', 68),
    ('quote-069', 69),
    ('quote-070', 70),
    ('quote-071', 71),
    ('quote-072', 72),
    ('quote-073', 73),
    ('quote-074', 74),
    ('quote-075', 75),
    ('quote-076', 76),
    ('quote-077', 77),
    ('quote-078', 78),
    ('quote-079', 79),
    ('quote-080', 80),
    ('quote-081', 81),
    ('quote-082', 82),
    ('quote-084', 83),
    ('quote-085', 84),
    ('quote-087', 85),
    ('quote-089', 86),
    ('quote-093', 87),
    ('quote-094', 88),
    ('quote-096', 89),
    ('quote-098', 90),
    ('quote-099', 91),
    ('quote-101', 92),
    ('quote-102', 93),
    ('quote-103', 94),
    ('quote-104', 95),
    ('quote-105', 96),
    ('quote-106', 97),
    ('quote-107', 98),
    ('quote-108', 99),
    ('quote-109', 100),
    ('quote-110', 101),
    ('quote-111', 102),
    ('quote-112', 103),
    ('quote-113', 104),
    ('quote-114', 105),
    ('quote-115', 106),
    ('quote-116', 107),
    ('quote-117', 108),
    ('quote-118', 109),
    ('quote-119', 110),
    ('quote-120', 111),
    ('quote-123', 112),
    ('quote-124', 113);

  CREATE TEMP TABLE quote_src (
    ord integer PRIMARY KEY,
    id text NOT NULL,
    author text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO quote_src (ord, id, author)
  SELECT row_number() OVER (ORDER BY src.pref), src.id, src.author
  FROM (
    SELECT d.id, d.author, p.ord AS pref
    FROM quote_pref p
    JOIN "DailyQuote" d ON d.id = p.id
    UNION ALL
    SELECT d.id, d.author, 1000000 + row_number() OVER (ORDER BY d."sortOrder", d.id)
    FROM "DailyQuote" d
    WHERE NOT EXISTS (SELECT 1 FROM quote_pref p WHERE p.id = d.id)
  ) src;

  SELECT COALESCE(array_agg(id ORDER BY ord), ARRAY[]::text[])
    INTO ids
  FROM quote_src;

  n := COALESCE(array_length(ids, 1), 0);
  IF n < 2 THEN
    RAISE EXCEPTION 'в списке цитат слишком мало строк';
  END IF;

  CREATE TEMP TABLE quote_author (
    author text PRIMARY KEY,
    cnt integer NOT NULL,
    seen integer NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO quote_author (author, cnt, seen)
  SELECT author, COUNT(*)::integer, MIN(ord)
  FROM quote_src
  GROUP BY author;

  EXECUTE $fn$
  CREATE OR REPLACE FUNCTION pg_temp.quote_search(author_index integer, occupied boolean[], gap integer, total integer)
  RETURNS text[]
  LANGUAGE plpgsql AS $body$
  DECLARE
    author_name text;
    need integer;
    step integer;
    start_at integer;
    k integer;
    pos integer;
    positions integer[];
    quote_ids text[];
    next_occupied boolean[];
    placed text[];
    fits boolean;
    dist integer;
    prev integer;
    author_total integer;
  BEGIN
    SELECT COUNT(*)::integer INTO author_total FROM quote_author;
    IF author_index > author_total THEN
      RETURN array_fill(''::text, ARRAY[total]);
    END IF;

    SELECT qa.author INTO author_name
    FROM quote_author qa
    ORDER BY qa.cnt DESC, qa.seen ASC
    OFFSET author_index - 1
    LIMIT 1;

    SELECT COALESCE(array_agg(qs.id ORDER BY qs.ord), ARRAY[]::text[])
      INTO quote_ids
    FROM quote_src qs
    WHERE qs.author = author_name;

    need := COALESCE(array_length(quote_ids, 1), 0);
    IF need < 1 OR floor(total::numeric / need) < gap THEN
      RETURN NULL;
    END IF;

    FOR step IN REVERSE floor(total::numeric / need)::integer .. gap LOOP
      FOR start_at IN 0 .. total - 1 LOOP
        positions := ARRAY[]::integer[];
        fits := true;
        FOR k IN 0 .. need - 1 LOOP
          pos := (start_at + k * step) % total;
          IF occupied[pos + 1] OR pos = ANY(positions) THEN
            fits := false;
            EXIT;
          END IF;
          FOREACH prev IN ARRAY positions LOOP
            dist := abs(pos - prev);
            IF total - dist < dist THEN
              dist := total - dist;
            END IF;
            IF dist < gap THEN
              fits := false;
              EXIT;
            END IF;
          END LOOP;
          IF NOT fits THEN
            EXIT;
          END IF;
          positions := array_append(positions, pos);
        END LOOP;
        IF NOT fits OR COALESCE(array_length(positions, 1), 0) <> need THEN
          CONTINUE;
        END IF;
        next_occupied := occupied;
        FOREACH prev IN ARRAY positions LOOP
          next_occupied[prev + 1] := true;
        END LOOP;
        placed := pg_temp.quote_search(author_index + 1, next_occupied, gap, total);
        IF placed IS NOT NULL THEN
          FOR k IN 1 .. need LOOP
            placed[positions[k] + 1] := quote_ids[k];
          END LOOP;
          RETURN placed;
        END IF;
      END LOOP;
    END LOOP;
    RETURN NULL;
  END
  $body$
  $fn$;

  placed_ids := pg_temp.quote_search(1, array_fill(false, ARRAY[n]), 7, n);
  IF placed_ids IS NULL THEN
    RAISE EXCEPTION 'не удалось развести авторов на 7 дней';
  END IF;

  CREATE TEMP TABLE quote_slot (
    ord integer PRIMARY KEY,
    id text NOT NULL,
    author text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO quote_slot (ord, id, author)
  SELECT series.i, placed_ids[series.i], src.author
  FROM generate_series(1, n) AS series(i)
  JOIN quote_src AS src ON src.id = placed_ids[series.i];

  IF (SELECT COUNT(*) FROM quote_slot) <> n THEN
    RAISE EXCEPTION 'пустая позиция в очереди';
  END IF;

  achieved := n;
  FOR i IN 1..n LOOP
    FOR other IN 1..n LOOP
      IF i <> other AND (SELECT author FROM quote_slot WHERE ord = other) = (SELECT author FROM quote_slot WHERE ord = i) THEN
        dist := abs(i - other);
        IF n - dist < dist THEN
          dist := n - dist;
        END IF;
        IF dist < achieved THEN
          achieved := dist;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  IF achieved < 7 THEN
    RAISE EXCEPTION 'один автор ближе чем через 7 дней: %', achieved;
  END IF;

  UPDATE "DailyQuote" AS quote
  SET "sortOrder" = slot.ord
  FROM quote_slot AS slot
  WHERE quote.id = slot.id;

  SELECT d.id INTO today_id
  FROM "DailyQuote" d
  WHERE d.id = 'quote-093' OR d.author = 'В. С. Найпол'
  ORDER BY CASE WHEN d.id = 'quote-093' THEN 0 ELSE 1 END, d.id
  LIMIT 1;

  IF today_id IS NULL THEN
    RAISE EXCEPTION 'в списке нет цитаты Найпола';
  END IF;

  pin_json := '{"date":"2026-10-26","quoteId":"' || today_id || '"}';

  INSERT INTO "MailBroadcast" (
    "key", "enabled", "timeZone", "weekdays", "minute", "windowMinutes",
    "oncePerDay", "audience", "studentIds", "sender", "updatedAt"
  )
  SELECT
    'quote-seq', false, 'Europe/Moscow', '', 0, 0,
    false, 'all', pin_json, 'profile', CURRENT_TIMESTAMP
  WHERE NOT EXISTS (SELECT 1 FROM "MailBroadcast" WHERE "key" = 'quote-seq');

  UPDATE "MailBroadcast"
  SET "studentIds" = pin_json,
      "enabled" = false,
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE "key" = 'quote-seq'
    AND "studentIds" LIKE '%"date":"2026-10-26"%'
    AND "studentIds" LIKE '%"quoteId":"quote-004"%';
END
$balance$;
