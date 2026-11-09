-- Только чтение. Запуск: psql "$DATABASE_URL" -f scripts/notes-audit.sql
-- Печатает количества, контрольные суммы и номера неоднозначных заметок.
-- Тексты заметок и имена учеников наружу не выводятся: они входят только в сумму.
-- Случай 3 — эвристика без страницы перед глазами: цитата совпала с подписью
-- страницы или подпись равна «Страница» (так код зовёт место без настоящего заголовка).

BEGIN READ ONLY;

SELECT раздел, вид, значение
FROM (
  SELECT 10 AS порядок, 'заметки' AS раздел, 'всего' AS вид, count(*)::text AS значение FROM "Note"
  UNION ALL SELECT 11, 'заметки', 'без цитаты', count(*)::text FROM "Note" WHERE btrim("anchorQuote") = ''
  UNION ALL SELECT 12, 'заметки', 'с цитатой', count(*)::text FROM "Note" WHERE btrim("anchorQuote") <> ''
  UNION ALL SELECT 13, 'заметки', 'открытые', count(*)::text FROM "Note" WHERE resolved = false
  UNION ALL SELECT 14, 'заметки', 'закрытые', count(*)::text FROM "Note" WHERE resolved = true
  UNION ALL SELECT 15, 'заметки', 'наставник', count(*)::text FROM "Note" WHERE "authorRole" = 'MENTOR'
  UNION ALL SELECT 16, 'заметки', 'ученик', count(*)::text FROM "Note" WHERE "authorRole" = 'STUDENT'
  UNION ALL SELECT 17, 'заметки', 'без имени автора', count(*)::text FROM "Note" WHERE btrim(author) = ''
  UNION ALL SELECT 20, 'ответы', 'всего', count(*)::text FROM "Comment" WHERE model = 'Note'
  UNION ALL SELECT 30, 'напоминания', 'всего', count(*)::text FROM "NoteReminderSend"
) AS сводка
ORDER BY порядок;

SELECT 'сумма' AS отчёт, имя, сумма
FROM (
  SELECT 1 AS порядок, 'заметки' AS имя, md5(coalesce(string_agg(строка, E'\n' ORDER BY id), '')) AS сумма
  FROM (
    SELECT n.id,
      concat_ws(E'\t',
        n.id,
        n."studentId",
        n.author,
        n."authorRole",
        n.text,
        n."anchorQuote",
        n."anchorLabel",
        n."anchorUrl",
        coalesce(n."anchorOffset"::text, ''),
        CASE WHEN n.resolved THEN '1' ELSE '0' END,
        n."resolvedBy",
        coalesce(to_char(n."resolvedAt", 'YYYY-MM-DD HH24:MI:SS.MS'), ''),
        to_char(n."createdAt", 'YYYY-MM-DD HH24:MI:SS.MS'),
        to_char(n."updatedAt", 'YYYY-MM-DD HH24:MI:SS.MS'),
        coalesce((
          SELECT string_agg(c.id, ',' ORDER BY c.id)
          FROM "Comment" c
          WHERE c.model = 'Note' AND c."recordId" = n.id
        ), ''),
        coalesce((
          SELECT string_agg(r.id, ',' ORDER BY r.id)
          FROM "NoteReminderSend" r
          WHERE r."noteId" = n.id
        ), '')
      ) AS строка
    FROM "Note" n
  ) AS заметки
  UNION ALL
  SELECT 2, 'ответы', md5(coalesce(string_agg(строка, E'\n' ORDER BY id), ''))
  FROM (
    SELECT c.id,
      concat_ws(E'\t',
        c.id,
        c.model,
        c."recordId",
        coalesce(c.field, ''),
        c.author,
        c.text,
        to_char(c."createdAt", 'YYYY-MM-DD HH24:MI:SS.MS')
      ) AS строка
    FROM "Comment" c
    WHERE c.model = 'Note'
  ) AS ответы
  UNION ALL
  SELECT 3, 'напоминания', md5(coalesce(string_agg(строка, E'\n' ORDER BY id), ''))
  FROM (
    SELECT r.id,
      concat_ws(E'\t',
        r.id,
        r."studentId",
        r."noteId",
        to_char(r."sentAt", 'YYYY-MM-DD HH24:MI:SS.MS')
      ) AS строка
    FROM "NoteReminderSend" r
  ) AS журнал
) AS суммы
ORDER BY порядок;

SELECT 'общая сумма' AS отчёт,
  md5(concat_ws(E'\n',
    (SELECT md5(coalesce(string_agg(строка, E'\n' ORDER BY id), '')) FROM (
      SELECT n.id,
        concat_ws(E'\t',
          n.id, n."studentId", n.author, n."authorRole", n.text, n."anchorQuote",
          n."anchorLabel", n."anchorUrl", coalesce(n."anchorOffset"::text, ''),
          CASE WHEN n.resolved THEN '1' ELSE '0' END, n."resolvedBy",
          coalesce(to_char(n."resolvedAt", 'YYYY-MM-DD HH24:MI:SS.MS'), ''),
          to_char(n."createdAt", 'YYYY-MM-DD HH24:MI:SS.MS'),
          to_char(n."updatedAt", 'YYYY-MM-DD HH24:MI:SS.MS'),
          coalesce((SELECT string_agg(c.id, ',' ORDER BY c.id) FROM "Comment" c WHERE c.model = 'Note' AND c."recordId" = n.id), ''),
          coalesce((SELECT string_agg(r.id, ',' ORDER BY r.id) FROM "NoteReminderSend" r WHERE r."noteId" = n.id), '')
        ) AS строка
      FROM "Note" n
    ) s),
    (SELECT md5(coalesce(string_agg(строка, E'\n' ORDER BY id), '')) FROM (
      SELECT c.id, concat_ws(E'\t', c.id, c.model, c."recordId", coalesce(c.field, ''), c.author, c.text, to_char(c."createdAt", 'YYYY-MM-DD HH24:MI:SS.MS')) AS строка
      FROM "Comment" c WHERE c.model = 'Note'
    ) s),
    (SELECT md5(coalesce(string_agg(строка, E'\n' ORDER BY id), '')) FROM (
      SELECT r.id, concat_ws(E'\t', r.id, r."studentId", r."noteId", to_char(r."sentAt", 'YYYY-MM-DD HH24:MI:SS.MS')) AS строка
      FROM "NoteReminderSend" r
    ) s)
  )) AS сумма;

SELECT случай, id
FROM (
  SELECT '1 стикер ученика без ответа наставника' AS случай, n.id
  FROM "Note" n
  WHERE btrim(n."anchorQuote") = ''
    AND n."authorRole" = 'STUDENT'
    AND NOT EXISTS (
      SELECT 1 FROM "Comment" c
      WHERE c.model = 'Note' AND c."recordId" = n.id AND c.author = 'Наставник'
    )
  UNION ALL
  SELECT '2 стикер наставника без ответа ученика', n.id
  FROM "Note" n
  WHERE btrim(n."anchorQuote") = ''
    AND n."authorRole" = 'MENTOR'
    AND NOT EXISTS (
      SELECT 1 FROM "Comment" c
      WHERE c.model = 'Note' AND c."recordId" = n.id AND c.author = 'Ученик'
    )
  UNION ALL
  SELECT '3 цитата похожа на заголовок страницы', n.id
  FROM "Note" n
  WHERE btrim(n."anchorQuote") <> ''
    AND (
      lower(btrim(n."anchorQuote")) = lower(btrim(n."anchorLabel"))
      OR btrim(n."anchorLabel") = 'Страница'
    )
  UNION ALL
  SELECT '4 цитата без адреса страницы', n.id
  FROM "Note" n
  WHERE btrim(n."anchorQuote") <> ''
    AND btrim(n."anchorUrl") = ''
  UNION ALL
  SELECT '5 закрытый стикер без цитаты', n.id
  FROM "Note" n
  WHERE n.resolved = true
    AND btrim(n."anchorQuote") = ''
  UNION ALL
  SELECT '6 пустое имя автора', n.id
  FROM "Note" n
  WHERE btrim(n.author) = ''
  UNION ALL
  SELECT '7 на стикере уже есть ответ другого', n.id
  FROM "Note" n
  WHERE btrim(n."anchorQuote") = ''
    AND EXISTS (
      SELECT 1 FROM "Comment" c
      WHERE c.model = 'Note'
        AND c."recordId" = n.id
        AND (
          (n."authorRole" = 'MENTOR' AND c.author = 'Ученик')
          OR (n."authorRole" <> 'MENTOR' AND c.author = 'Наставник')
        )
    )
) AS список
ORDER BY случай, id;

ROLLBACK;
