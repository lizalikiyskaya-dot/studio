-- Статус главы. Только добавление: старые строки получают «в процессе».
-- Повтор безопасен: тип и столбец создаются, если их ещё нет.

DO $$
BEGIN
  CREATE TYPE "ChapterReviewStatus" AS ENUM (
    'IN_PROGRESS',
    'SUBMITTED',
    'IN_REVIEW',
    'NEEDS_REVISION',
    'ACCEPTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PlanChapter"
  ADD COLUMN IF NOT EXISTS "reviewStatus" "ChapterReviewStatus" NOT NULL DEFAULT 'IN_PROGRESS';
