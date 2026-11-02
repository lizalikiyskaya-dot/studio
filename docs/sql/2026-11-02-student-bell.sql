-- Колокольчик ученика. Таблица MentorItemSeen уже есть в живой базе.
-- Этот файл ничего не пересоздаёт: только IF NOT EXISTS.
-- Новое, если колонки ещё нет: dismissedAt. «Удалить» прячет строку
-- только у этого человека. Задание и заметка в кабинете остаются.
-- Та же строка уже есть в docs/sql/2026-11-02-mentor-feed.sql.
-- Если тот файл накатили целиком, здесь делать нечего.
-- Повторный запуск безопасен.

CREATE TABLE IF NOT EXISTS "MentorItemSeen" (
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),
    CONSTRAINT "MentorItemSeen_pkey" PRIMARY KEY ("userId", "kind", "sourceId")
);

ALTER TABLE "MentorItemSeen" ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "MentorItemSeen_userId_idx" ON "MentorItemSeen" ("userId");
