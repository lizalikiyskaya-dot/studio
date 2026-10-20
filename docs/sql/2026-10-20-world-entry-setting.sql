-- Записи библии мира привязаны к таблице GRAPES.
-- Пустая строка — первая таблица (поля на Book). Старые строки её и получают.
-- Повторный запуск безопасен.

ALTER TABLE "WorldEntry" ADD COLUMN IF NOT EXISTS "settingKey" TEXT NOT NULL DEFAULT '';
