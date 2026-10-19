-- Письмо в день оплаты.
-- Только новые столбцы и новая таблица. Существующие строки не читаются и не меняются.
-- Повторный запуск ничего не затирает.
-- paymentReminders по умолчанию true: письмо уйдёт только если наставник уже указал paymentDay.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentAmount" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentReminders" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "PaymentReminderLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "dueOn" DATE NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentReminderLog_studentId_dueOn_key"
    ON "PaymentReminderLog" ("studentId", "dueOn");
CREATE INDEX IF NOT EXISTS "PaymentReminderLog_dueOn_idx"
    ON "PaymentReminderLog" ("dueOn");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PaymentReminderLog_studentId_fkey'
  ) THEN
    ALTER TABLE "PaymentReminderLog"
      ADD CONSTRAINT "PaymentReminderLog_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
