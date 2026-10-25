-- Статус главы в трекере. Только добавление.
-- Повторный запуск безопасен. Уже существующие главы остаются «в процессе».

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
