-- Примеры круга Хармона: Салли и Марлин.
-- Ученикам, у которых примеры уже есть, две карточки добавляются один раз.
-- У кого примеров ещё нет, все три карточки создаст страница упражнений.
-- Повторный запуск ничего не переписывает и ничего не удаляет.

INSERT INTO "StoryCircleCard" (id, "studentId", "order", hero, data, "isExample")
SELECT
  'seed-sally-' || s."studentId",
  s."studentId",
  s.max_order + 1,
  'Салли (Корпорация монстров)',
  jsonb_build_object(
    'you', 'лучший страшила на фабрике, живёт спокойно и пугает детей вместе с Майком',
    'need', 'хочет и дальше быть первым в рейтинге и не потерять работу',
    'go', 'через дверь в мир монстров попадает девочка Бу',
    'search', 'прячет Бу от Рэндалла и ищет дверь, чтобы вернуть её домой',
    'find', 'находит дверь Бу и понимает, что ребёнок ему не враг',
    'take', 'директор отбирает Бу и выбрасывает Салли в снежные горы',
    'return', 'возвращается на фабрику, отдаёт Бу домой, и крик заменяют смехом',
    'change', 'больше не пугает детей и хранит кусочек её двери'
  ),
  true
FROM (
  SELECT "studentId", MAX("order") AS max_order
  FROM "StoryCircleCard"
  WHERE "isExample" = true
  GROUP BY "studentId"
) s
WHERE NOT EXISTS (
  SELECT 1
  FROM "StoryCircleCard" existing
  WHERE existing."studentId" = s."studentId"
    AND existing."isExample" = true
    AND existing.hero = 'Салли (Корпорация монстров)'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "StoryCircleCard" (id, "studentId", "order", hero, data, "isExample")
SELECT
  'seed-marlin-' || s."studentId",
  s."studentId",
  s.max_order + 1,
  'Марлин (В поисках Немо)',
  jsonb_build_object(
    'you', 'живёт с сыном Немо на рифе и боится отпускать его от дома',
    'need', 'хочет, чтобы с Немо ничего не случилось и он был рядом',
    'go', 'дайвер забирает Немо, и Марлин плывёт в открытый океан',
    'search', 'плывёт с Дори через медуз, черепах и кита и всех спрашивает о сыне',
    'find', 'добирается до Сиднея и находит Немо в аквариуме стоматолога',
    'take', 'думает, что Немо погиб, и бросает поиск и Дори',
    'return', 'встречает живого Немо в море, и они вместе плывут на риф',
    'change', 'отпускает сына в школу к обрыву и больше не держит его из страха'
  ),
  true
FROM (
  SELECT "studentId", MAX("order") AS max_order
  FROM "StoryCircleCard"
  WHERE "isExample" = true
  GROUP BY "studentId"
) s
WHERE NOT EXISTS (
  SELECT 1
  FROM "StoryCircleCard" existing
  WHERE existing."studentId" = s."studentId"
    AND existing."isExample" = true
    AND existing.hero = 'Марлин (В поисках Немо)'
)
ON CONFLICT (id) DO NOTHING;
