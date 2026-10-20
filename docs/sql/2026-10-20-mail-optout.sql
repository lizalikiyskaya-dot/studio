-- Отдельная отписка от задания недели и цитаты дня.
-- Два новых столбца. У существующих учеников значение true: письма не выключаются.
-- Повторный запуск ничего не затирает. Пароля здесь нет.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "weeklyEmails" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "quoteEmails" BOOLEAN NOT NULL DEFAULT true;
