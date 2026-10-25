-- Магазин методичек.
-- Цена хранится на методичке. Покупка — строка журнала с видом GUIDE и направлением SPEND.
-- Старые строки учеников и уже открытые методички не меняются.
-- Повторный запуск безопасен.

ALTER TABLE "Guide"
  ADD COLUMN IF NOT EXISTS "starPrice" INTEGER;

DO $$
BEGIN
  ALTER TABLE "Guide"
    ADD CONSTRAINT "Guide_starPrice_check"
    CHECK ("starPrice" IS NULL OR "starPrice" IN (8, 12, 18));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "StarKind" ADD VALUE 'GUIDE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
