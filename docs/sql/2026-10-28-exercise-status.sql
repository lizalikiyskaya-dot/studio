-- Статус карточек упражнений: как у заданий.
-- Уже существующие карточки остаются «в работе».
-- Повторный запуск ничего не меняет и ничего не удаляет.

ALTER TABLE "PopArcCharacter"
  ADD COLUMN IF NOT EXISTS "status" "TaskStatus" NOT NULL DEFAULT 'IN_PROGRESS';

ALTER TABLE "BeliefCard"
  ADD COLUMN IF NOT EXISTS "status" "TaskStatus" NOT NULL DEFAULT 'IN_PROGRESS';

ALTER TABLE "StoryCircleCard"
  ADD COLUMN IF NOT EXISTS "status" "TaskStatus" NOT NULL DEFAULT 'IN_PROGRESS';
