-- Книги в разделе «Материалы»: отметка «по желанию».
-- Существующие строки получают false и не переписываются.
-- Повторный запуск безопасен.

ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "optional" BOOLEAN NOT NULL DEFAULT false;
