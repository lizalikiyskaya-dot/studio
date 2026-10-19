-- Статусы «не отправлено» и «отправлено» в трекере заявок
-- и связь заявки с опен-коллом, чтобы один опен-колл не добавлялся дважды.
-- Старые строки WAITING / ACCEPTED / REJECTED не переписываются.
-- Значение по умолчанию у колонки статуса не меняется:
-- новое значение enum нельзя использовать в той же транзакции, где оно добавлено.
-- Повторный запуск безопасен.

ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'NOT_SENT';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'SENT';

ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "openCallId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Submission_openCallId_key" ON "Submission"("openCallId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Submission_openCallId_fkey'
  ) THEN
    ALTER TABLE "Submission"
      ADD CONSTRAINT "Submission_openCallId_fkey"
      FOREIGN KEY ("openCallId") REFERENCES "OpenCall"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
