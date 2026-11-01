-- Кто из учеников открыл или скачал методичку.
-- Новая таблица. Существующие таблицы, колонки и данные не меняются.
-- Повторный запуск ничего не удаляет и не переписывает уже записанные даты.
-- «Guide» и «User» здесь только ссылки внешнего ключа. Сами таблицы не переписываются.

CREATE TABLE IF NOT EXISTS "GuideOpen" (
    "guideId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "firstOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuideOpen_pkey" PRIMARY KEY ("guideId", "studentId")
);

CREATE INDEX IF NOT EXISTS "GuideOpen_studentId_idx" ON "GuideOpen"("studentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuideOpen_guideId_fkey') THEN
    ALTER TABLE "GuideOpen"
      ADD CONSTRAINT "GuideOpen_guideId_fkey"
      FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuideOpen_studentId_fkey') THEN
    ALTER TABLE "GuideOpen"
      ADD CONSTRAINT "GuideOpen_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
