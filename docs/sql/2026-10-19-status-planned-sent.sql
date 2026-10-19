-- Новые значения уже существующих статусов. Старые строки не трогаем.
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'PLANNED';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'NOT_SENT';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'SENT';
