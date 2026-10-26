-- Прогресс рассказа: знаки и статус проверки, как у главы.
-- Только новые столбцы. Уже существующие рассказы остаются «в процессе» с нулём знаков.

ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "writtenChars" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "plannedChars" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "reviewStatus" "ChapterReviewStatus" NOT NULL DEFAULT 'IN_PROGRESS';
