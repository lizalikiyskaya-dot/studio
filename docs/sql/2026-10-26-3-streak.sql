-- Серия: засчитанные недели и недели отдыха.
-- Новое значение журнала звёзд STREAK. В этом файле оно не используется.
-- Повторный запуск безопасен. Строки учеников не меняются и не удаляются.

CREATE TABLE IF NOT EXISTS "StreakWeek" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "weekStart" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "StreakWeek_studentId_weekStart_key"
  ON "StreakWeek" ("studentId", "weekStart");

CREATE TABLE IF NOT EXISTS "StreakVacation" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "weekStart" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "StreakVacation_studentId_weekStart_key"
  ON "StreakVacation" ("studentId", "weekStart");

DO $$
BEGIN
  ALTER TYPE "StarKind" ADD VALUE 'STREAK';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
