-- Журнал писем про открытые заметки наставника.
-- Только новая таблица. Существующие строки не читаются и не меняются.
-- Повторный запуск ничего не затирает.
-- Та же заметка снова попадает в письмо не раньше чем через неделю: это решает код, не уникальный ключ.

CREATE TABLE IF NOT EXISTS "NoteReminderSend" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoteReminderSend_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NoteReminderSend_noteId_sentAt_idx"
    ON "NoteReminderSend" ("noteId", "sentAt");
CREATE INDEX IF NOT EXISTS "NoteReminderSend_studentId_sentAt_idx"
    ON "NoteReminderSend" ("studentId", "sentAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NoteReminderSend_studentId_fkey'
  ) THEN
    ALTER TABLE "NoteReminderSend"
      ADD CONSTRAINT "NoteReminderSend_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'NoteReminderSend_noteId_fkey'
  ) THEN
    ALTER TABLE "NoteReminderSend"
      ADD CONSTRAINT "NoteReminderSend_noteId_fkey"
      FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
