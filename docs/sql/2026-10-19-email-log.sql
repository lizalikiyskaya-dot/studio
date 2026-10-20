-- Журнал попыток отправить письмо. Новая таблица, старые строки не читаются и не меняются.
-- Повторный запуск ничего не затирает.

CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "html" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "EmailLog_type_idx" ON "EmailLog" ("type");
CREATE INDEX IF NOT EXISTS "EmailLog_recipientUserId_idx" ON "EmailLog" ("recipientUserId");

ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "html" TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_recipientUserId_fkey'
  ) THEN
    ALTER TABLE "EmailLog"
      ADD CONSTRAINT "EmailLog_recipientUserId_fkey"
      FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
