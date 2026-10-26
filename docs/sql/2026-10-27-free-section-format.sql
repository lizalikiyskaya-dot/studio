-- Формат текста в «Дополнительно».
-- Уже записанные ответы остаются обычным текстом.
-- Повторный запуск ничего не меняет и ничего не удаляет.

ALTER TABLE "FreeSection"
  ADD COLUMN IF NOT EXISTS "contentFormat" TEXT NOT NULL DEFAULT 'plain';
