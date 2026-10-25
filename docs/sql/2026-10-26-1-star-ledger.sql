-- Журнал звёзд остаётся в таблице "StarAward".
-- Новое: направление строки. Старые строки становятся начислениями, очки не переписываются.
-- Повторный запуск безопасен.

DO $$
BEGIN
  CREATE TYPE "StarDirection" AS ENUM ('EARN', 'SPEND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "StarAward"
  ADD COLUMN IF NOT EXISTS "direction" "StarDirection" NOT NULL DEFAULT 'EARN';

DO $$
BEGIN
  ALTER TYPE "StarKind" ADD VALUE 'CHAPTER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
