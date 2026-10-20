-- От кого уходят письма. Три новых пустых столбца у User.
-- Пароль SMTP сюда не пишется. Повторный запуск ничего не затирает.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mailFromName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mailFromEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mailReplyTo" TEXT NOT NULL DEFAULT '';
