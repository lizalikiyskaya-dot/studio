-- Текст главы, который ученик пишет в «Рукописях».
-- writtenHere = true: writtenChars считает редактор, руками в трекере его не меняют.
-- Старые главы остаются с ручным вводом: текст пустой, writtenHere = false.
-- Повторный запуск ничего не удаляет и не переписывает уже записанные числа.

ALTER TABLE "PlanChapter" ADD COLUMN IF NOT EXISTS "manuscript" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PlanChapter" ADD COLUMN IF NOT EXISTS "manuscriptFormat" TEXT NOT NULL DEFAULT 'plain';
ALTER TABLE "PlanChapter" ADD COLUMN IF NOT EXISTS "writtenHere" BOOLEAN NOT NULL DEFAULT false;
