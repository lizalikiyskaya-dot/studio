-- Одна глава на трекер и план.
-- Только новые столбцы и индексы. Строки учеников не удаляем, старые тексты не очищаем.
-- Сами тексты копирует кабинет при первом открытии книги (Book.chaptersUnified).
-- Повторный запуск безопасен.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planView" TEXT NOT NULL DEFAULT 'ribbon';

ALTER TABLE "Book" ADD COLUMN IF NOT EXISTS "chaptersUnified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PlanChapter" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PlanChapter" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PlanChapter" ADD COLUMN IF NOT EXISTS "actId" TEXT;

ALTER TABLE "StorylineBlock" ADD COLUMN IF NOT EXISTS "planChapterId" TEXT;
ALTER TABLE "StorylineBlock" ALTER COLUMN "chapterId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "PlanChapter_actId_idx" ON "PlanChapter"("actId");
CREATE INDEX IF NOT EXISTS "StorylineBlock_planChapterId_idx" ON "StorylineBlock"("planChapterId");

DO $$
BEGIN
  ALTER TABLE "PlanChapter"
    ADD CONSTRAINT "PlanChapter_actId_fkey"
    FOREIGN KEY ("actId") REFERENCES "Act"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "StorylineBlock"
    ADD CONSTRAINT "StorylineBlock_planChapterId_fkey"
    FOREIGN KEY ("planChapterId") REFERENCES "PlanChapter"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
