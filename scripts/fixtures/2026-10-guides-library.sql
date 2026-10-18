-- Библиотека методичек.
-- Только НОВЫЕ таблицы. Существующие таблицы, колонки и данные не меняются:
-- нет DROP, нет RENAME, нет правок уже существующих колонок.
-- «User» здесь только ссылка внешнего ключа с новых таблиц. Сама таблица учеников не переписывается.
--
-- Скрипт можно запускать повторно: повтор ничего не ломает и не затирает.
-- Запускать ДО выкладки кода (см. описание pull request).
--
-- Как выполнить на сервере (подставьте свою строку подключения, пароль в чат не копировать):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/2026-10-guides-library.sql
--
-- Тип "MaterialStatus" уже есть в базе (статусы книг и личных методичек). Скрипт его не создаёт и не меняет.

SET client_min_messages TO WARNING;

BEGIN;

CREATE TABLE IF NOT EXISTS "Guide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileMime" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notifyOnOpen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "fileMime" TEXT;
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "notifyOnOpen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Guide" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Guide" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "GuideAccess" (
    "guideId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuideAccess_pkey" PRIMARY KEY ("guideId", "studentId")
);

ALTER TABLE "GuideAccess" ADD COLUMN IF NOT EXISTS "guideId" TEXT;
ALTER TABLE "GuideAccess" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE "GuideAccess" ADD COLUMN IF NOT EXISTS "visible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GuideAccess" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "GuideAccess" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "GuideProgress" (
    "guideId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "MaterialStatus" NOT NULL DEFAULT 'UNREAD',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuideProgress_pkey" PRIMARY KEY ("guideId", "studentId")
);

ALTER TABLE "GuideProgress" ADD COLUMN IF NOT EXISTS "guideId" TEXT;
ALTER TABLE "GuideProgress" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE "GuideProgress" ADD COLUMN IF NOT EXISTS "status" "MaterialStatus" NOT NULL DEFAULT 'UNREAD';
ALTER TABLE "GuideProgress" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "GuideProgress" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE INDEX IF NOT EXISTS "GuideAccess_studentId_idx" ON "GuideAccess"("studentId");
CREATE INDEX IF NOT EXISTS "GuideProgress_studentId_idx" ON "GuideProgress"("studentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuideAccess_guideId_fkey') THEN
    ALTER TABLE "GuideAccess"
      ADD CONSTRAINT "GuideAccess_guideId_fkey"
      FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuideAccess_studentId_fkey') THEN
    ALTER TABLE "GuideAccess"
      ADD CONSTRAINT "GuideAccess_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuideProgress_guideId_fkey') THEN
    ALTER TABLE "GuideProgress"
      ADD CONSTRAINT "GuideProgress_guideId_fkey"
      FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GuideProgress_studentId_fkey') THEN
    ALTER TABLE "GuideProgress"
      ADD CONSTRAINT "GuideProgress_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
