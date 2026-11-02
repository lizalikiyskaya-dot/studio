-- Колокольчик ученика. Та же таблица, что у ленты наставника:
-- кто открыл событие. kind + sourceId указывают на задание, заметку или раздел.
-- Если лента наставника уже создала таблицу, этот файл ничего не меняет.
-- Новых строк нет. Повторный запуск безопасен. Накатывать отдельно, после согласия.

CREATE TABLE IF NOT EXISTS "MentorItemSeen" (
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorItemSeen_pkey" PRIMARY KEY ("userId", "kind", "sourceId")
);

CREATE INDEX IF NOT EXISTS "MentorItemSeen_userId_idx" ON "MentorItemSeen" ("userId");
