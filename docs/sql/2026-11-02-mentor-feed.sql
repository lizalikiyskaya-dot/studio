-- Лента кабинета наставника.
-- ChapterFeedEvent: момент, когда глава стала «сдана». У главы нет своего времени.
-- MentorItemSeen: наставник открыл одно событие. kind + sourceId указывают на источник.
-- Новые таблицы, строк нет. Повторный запуск безопасен.

CREATE TABLE IF NOT EXISTS "ChapterFeedEvent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChapterFeedEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChapterFeedEvent_chapterId_key" ON "ChapterFeedEvent" ("chapterId");
CREATE INDEX IF NOT EXISTS "ChapterFeedEvent_studentId_idx" ON "ChapterFeedEvent" ("studentId");

DO $$
BEGIN
  ALTER TABLE "ChapterFeedEvent"
    ADD CONSTRAINT "ChapterFeedEvent_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MentorItemSeen" (
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorItemSeen_pkey" PRIMARY KEY ("userId", "kind", "sourceId")
);

CREATE INDEX IF NOT EXISTS "MentorItemSeen_userId_idx" ON "MentorItemSeen" ("userId");

-- «Удалить» в колокольчике. Та же колонка, что в docs/sql/2026-11-02-student-bell.sql.
-- Прячет строку только у этого человека. Задание и глава в кабинете остаются.
ALTER TABLE "MentorItemSeen" ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP(3);
