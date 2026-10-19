-- Доли типа сеттинга у цикла и отдельного рассказа, как у книги.
-- Старые settingMapX/Y не трогаем: пока доли пустые, кабинет считает их из точки.

ALTER TABLE "Cycle" ADD COLUMN IF NOT EXISTS "settingManifest" INTEGER;
ALTER TABLE "Cycle" ADD COLUMN IF NOT EXISTS "settingFilter" INTEGER;
ALTER TABLE "Cycle" ADD COLUMN IF NOT EXISTS "settingConflict" INTEGER;
ALTER TABLE "Cycle" ADD COLUMN IF NOT EXISTS "settingMagnet" INTEGER;

ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "settingManifest" INTEGER;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "settingFilter" INTEGER;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "settingConflict" INTEGER;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "settingMagnet" INTEGER;
