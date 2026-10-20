-- Настройки автоматических писем и пачка правок до отправки.
-- Новые таблицы, строк нет. Пароль SMTP сюда не пишется.
-- Пока наставник не сохранит строку, код берёт значения по умолчанию:
-- день оплаты и письма по событию включены, письма о правках и о визите выключены.

CREATE TABLE IF NOT EXISTS "MailBroadcast" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "weekdays" TEXT NOT NULL DEFAULT '',
    "hour" INTEGER,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "windowMinutes" INTEGER NOT NULL DEFAULT 60,
    "oncePerDay" BOOLEAN NOT NULL DEFAULT false,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "studentIds" TEXT NOT NULL DEFAULT '',
    "sender" TEXT NOT NULL DEFAULT 'profile',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MailBroadcast_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "MailDigest" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "MailDigest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MailDigest_kind_studentId_sentAt_idx"
  ON "MailDigest" ("kind", "studentId", "sentAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MailDigest_studentId_fkey'
  ) THEN
    ALTER TABLE "MailDigest"
      ADD CONSTRAINT "MailDigest_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
