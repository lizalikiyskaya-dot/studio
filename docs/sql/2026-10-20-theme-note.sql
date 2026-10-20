-- Заметка к одной теме «Библии мира».
-- Только новая таблица. Существующие таблицы и строки не меняются.
-- Повторный запуск ничего не затирает.
-- settingKey отличает таблицы GRAPES одного мира. У тем-записей он пустой.

CREATE TABLE IF NOT EXISTS "ThemeNote" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThemeNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ThemeNote_scope_ownerId_settingKey_theme_key"
    ON "ThemeNote" ("scope", "ownerId", "settingKey", "theme");

CREATE INDEX IF NOT EXISTS "ThemeNote_ownerId_idx"
    ON "ThemeNote" ("ownerId");
