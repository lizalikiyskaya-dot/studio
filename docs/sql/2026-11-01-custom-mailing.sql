-- Свои автоматические рассылки наставника.
-- Новая таблица, строк нет. Новая рассылка в коде создаётся выключенной.
-- Повторный запуск безопасен.

CREATE TABLE IF NOT EXISTS "CustomMailing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cadence" TEXT NOT NULL DEFAULT 'once',
    "runOn" TEXT NOT NULL DEFAULT '',
    "weekday" INTEGER NOT NULL DEFAULT 1,
    "monthDay" INTEGER NOT NULL DEFAULT 1,
    "hour" INTEGER NOT NULL DEFAULT 9,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "studentIds" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomMailing_pkey" PRIMARY KEY ("id")
);
