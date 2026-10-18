-- Доска «План книги». Запустить на проде ДО выкладки этой ветки.
-- Только новые столбцы с значениями по умолчанию. Старые строки не переписываются.
-- Повторный запуск безопасен.

ALTER TABLE "Act" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT '';
ALTER TABLE "StorylineBlock" ADD COLUMN IF NOT EXISTS "span" INTEGER NOT NULL DEFAULT 1;
