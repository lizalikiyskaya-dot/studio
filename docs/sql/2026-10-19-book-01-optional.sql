-- Книги в разделе «Материалы»: отметка «по желанию».
-- Существующие строки получают false и не переписываются.
-- Повторный запуск безопасен.
-- Имя файла раньше 2026-10-19-book-02-month.sql: деплой идёт по алфавиту,
-- а перенос месяца читает столбец optional.

ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "optional" BOOLEAN NOT NULL DEFAULT false;
