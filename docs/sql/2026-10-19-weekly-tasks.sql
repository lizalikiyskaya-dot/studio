-- Задание недели и журнал звёзд.
-- Только новые таблицы и сид из десяти заданий. Строки учеников не читаются и не меняются.
-- Повторный запуск не затирает сдачи и не дублирует задания: INSERT ... ON CONFLICT DO NOTHING.
-- Субботняя рассылка писем здесь не включается.

DO $$
BEGIN
  CREATE TYPE "StarKind" AS ENUM ('WEEKLY', 'MAIN_TASK', 'CONTEST', 'PUBLISHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WeeklyTask" (
    "id" TEXT NOT NULL,
    "publishedOn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "lengthHint" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "WeeklyTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyTask_publishedOn_key" ON "WeeklyTask" ("publishedOn");

CREATE TABLE IF NOT EXISTS "WeeklySubmission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weeklyTaskId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklySubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WeeklySubmission_studentId_weeklyTaskId_key"
    ON "WeeklySubmission" ("studentId", "weeklyTaskId");
CREATE INDEX IF NOT EXISTS "WeeklySubmission_studentId_idx" ON "WeeklySubmission" ("studentId");
CREATE INDEX IF NOT EXISTS "WeeklySubmission_weeklyTaskId_idx" ON "WeeklySubmission" ("weeklyTaskId");

CREATE TABLE IF NOT EXISTS "StarAward" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" "StarKind" NOT NULL,
    "points" INTEGER NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StarAward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StarAward_studentId_kind_sourceId_key"
    ON "StarAward" ("studentId", "kind", "sourceId");
CREATE INDEX IF NOT EXISTS "StarAward_studentId_idx" ON "StarAward" ("studentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklySubmission_studentId_fkey') THEN
    ALTER TABLE "WeeklySubmission"
      ADD CONSTRAINT "WeeklySubmission_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklySubmission_weeklyTaskId_fkey') THEN
    ALTER TABLE "WeeklySubmission"
      ADD CONSTRAINT "WeeklySubmission_weeklyTaskId_fkey"
      FOREIGN KEY ("weeklyTaskId") REFERENCES "WeeklyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StarAward_studentId_fkey') THEN
    ALTER TABLE "StarAward"
      ADD CONSTRAINT "StarAward_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "WeeklyTask" ("id", "publishedOn", "title", "prompt", "lengthHint", "sortOrder")
VALUES
  (
    'week-2026-10-24',
    '2026-10-24',
    'Комната после новости',
    $p$Опиши комнату так, чтобы по ней было ясно: хозяин только что узнал что-то плохое. Слово «плохо», названия эмоций и сама новость не пиши. Покажи это через вещи, свет, порядок или беспорядок.$p$,
    'полстраницы',
    1
  ),
  (
    'week-2026-10-31',
    '2026-10-31',
    'Спор не о том',
    $p$Напиши диалог двух людей. По словам они спорят о бытовой мелочи (посуда, опоздание, кто купит хлеб). По смыслу речь о другом: обида, ревность, усталость или недоверие. Нигде не называй, о чём на самом деле.$p$,
    'полстраницы',
    2
  ),
  (
    'week-2026-11-07',
    '2026-11-07',
    'Одна сцена, два взгляда',
    $p$Возьми короткую сцену: два человека встретились в кафе или у подъезда. Напиши её дважды: сначала от лица одного, потом от лица другого. Факты одни и те же, но каждый замечает своё и по-своему понимает слова собеседника.$p$,
    'по 10–12 строк на каждый взгляд',
    3
  ),
  (
    'week-2026-11-14',
    '2026-11-14',
    'Пять минут растянуть',
    $p$Выбери простой момент: человек ждёт лифт, стоит в очереди или идёт от остановки до дома. Растяни эти пять минут так, чтобы читатель прожил их вместе с героем. Пиши через мысли, тело, звуки вокруг. Не ускоряй время и не перескакивай часы.$p$,
    'полстраницы',
    4
  ),
  (
    'week-2026-11-21',
    '2026-11-21',
    'Без картинки',
    $p$Опиши место, где герой бывает часто (кухня, двор, офис, вагон метро). Нельзя писать, как оно выглядит. Можно только звуки, запахи, температуру, прикосновения. Читатель должен понять, где это, без одной зрительной детали.$p$,
    '12–15 строк',
    5
  ),
  (
    'week-2026-11-28',
    '2026-11-28',
    'Ужать вдвое',
    $p$Напиши сначала абзац на 8–10 предложений: герой приходит домой после долгого дня. Потом перепиши тот же абзац вдвое короче. Смысл и ощущение дня сохрани, воду и повторы убери.$p$,
    'два абзаца, длинный и короткий',
    6
  ),
  (
    'week-2026-12-05',
    '2026-12-05',
    'Первая фраза',
    $p$Придумай первую фразу рассказа, после которой хочется читать дальше. Затем допиши ещё 10 строк продолжения. Первая фраза должна поставить вопрос или странность, а продолжение этот вопрос не закрывает до конца.$p$,
    '1 фраза + 10 строк',
    7
  ),
  (
    'week-2026-12-12',
    '2026-12-12',
    'Лишняя вещь в декабре',
    $p$Опиши вечер в начале декабря: улица, подъезд или кухня перед праздниками. В сцене есть одна вещь, которой здесь быть не должно. Не объясняй, откуда она. Пусть читатель сам споткнётся об неё.$p$,
    'полстраницы',
    8
  ),
  (
    'week-2026-12-19',
    '2026-12-19',
    'Подарок не про подарок',
    $p$Напиши сцену, где один человек дарит другому подарок перед Новым годом. Сам предмет почти не важен. Через выбор подарка, реакцию и пару реплик покажи, что на самом деле происходит между этими людьми.$p$,
    'полстраницы',
    9
  ),
  (
    'week-2026-12-26',
    '2026-12-26',
    'Итог года в одной сцене',
    $p$Напиши короткую сцену про твоего героя (или нового, на один раз) в последние дни года. В этой сцене должно быть видно, чем этот год для него закончился: что изменилось, что осталось, от чего он отказывается или к чему идёт. Не пиши список итогов. Покажи через один вечер, один разговор или одну дорогу домой.$p$,
    'полстраницы',
    10
  )
ON CONFLICT ("id") DO NOTHING;
