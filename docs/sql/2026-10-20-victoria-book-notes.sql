-- Заметка к книге. Столбец пустой, методички его не показывают.
-- Повторный запуск безопасен.
--
-- Дальше — одноразовые правки книг Виктории (cmqtuks2e000j0rpow7knseef).
-- На экране «Материалы → Книги» месяц и пометка ещё сидят в скобках названия.
-- Название очищается, месяц пишется в свой столбец, пометка — в заметку.
-- Статус и отметка «по желанию» не меняются.
--
-- Строка ищется по ученику и порядку на экране: книги с category = BOOK,
-- row_number() по "order", id. Плюс префикс названия, чтобы чужая книга
-- на этой позиции не переписалась. Второй проход находит уже короткие
-- названия по тому же префиксу и пишет те же значения.

ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "note" TEXT;

UPDATE "Material" AS book
SET
  title = spec.title,
  month = spec.month,
  note = spec.note
FROM (
  SELECT ranked.id, v.title, v.month, v.note
  FROM (
    VALUES
      (
        5::bigint,
        'Тысячеликий герой%'::text,
        'Тысячеликий герой, Дж. Кэмпбелл'::text,
        'декабрь 2026 – январь 2027'::text,
        NULL::text
      ),
      (
        6::bigint,
        'Тезаурус эмоций%'::text,
        'Тезаурус эмоций, А. Акерман, Б. Пульизи'::text,
        'февраль 2027'::text,
        'Прочитать вводную часть, дальше пользоваться как словарём'::text
      ),
      (
        8::bigint,
        'Стилистика русского языка%'::text,
        'Стилистика русского языка, И. Голуб'::text,
        'апрель – май 2027'::text,
        'Не целиком: разделы о лексике и синтаксисе'::text
      )
  ) AS v(pos, prefix, title, month, note)
  JOIN (
    SELECT
      id,
      btrim(title) AS title,
      row_number() OVER (ORDER BY "order" ASC, id ASC) AS pos
    FROM "Material"
    WHERE "studentId" = 'cmqtuks2e000j0rpow7knseef'
      AND category = 'BOOK'
  ) AS ranked
    ON ranked.pos = v.pos
   AND ranked.title LIKE v.prefix
) AS spec
WHERE book.id = spec.id
  AND book."studentId" = 'cmqtuks2e000j0rpow7knseef'
  AND book.category = 'BOOK';
