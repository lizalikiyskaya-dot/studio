/**
 * Справочник значков. 21 методичка из плана, этапы, серии и пять уровней.
 * Новая методичка получает отдельную строку в базе, рисунок у неё общий.
 * Звёзды за значок не даём: они уже начислены за само событие.
 */

export type BadgeSection = "start" | "practice" | "methodical" | "contest" | "streak" | "level";

export type BadgeProgressKind = "tasks" | "stars" | "streak";

export type BadgeDef = {
  id: string;
  title: string;
  section: BadgeSection;
  sortOrder: number;
  hint: string;
  hintFormal: string;
  /** false: значок ставит только наставник. */
  auto: boolean;
  image: string;
  progress?: { kind: BadgeProgressKind; total: number };
  /** Номер ключевой методички, если это она. */
  code?: string;
  /** Устойчивое слово из названия. Короткие общие слова сюда не кладём. */
  phrase?: string;
};

export const BADGE_SECTIONS: { id: BadgeSection; label: string }[] = [
  { id: "start", label: "Старт" },
  { id: "practice", label: "Практика" },
  { id: "methodical", label: "Методички" },
  { id: "contest", label: "Конкурсы и публикации" },
  { id: "streak", label: "Серии" },
  { id: "level", label: "Уровни" },
];

export const GENERIC_METHODICAL_IMAGE = "/badges/methodical-new.png";

function both(informal: string, formal: string): Pick<BadgeDef, "hint" | "hintFormal"> {
  return { hint: informal, hintFormal: formal };
}

function same(text: string): Pick<BadgeDef, "hint" | "hintFormal"> {
  return { hint: text, hintFormal: text };
}

function methodicalHint(name: string): Pick<BadgeDef, "hint" | "hintFormal"> {
  return both(`Прими задание по методичке «${name}».`, `Примите задание по методичке «${name}».`);
}

function levelHint(title: string, stars: number): Pick<BadgeDef, "hint" | "hintFormal"> {
  return both(
    `Набери ${stars} звёзд в «заработано» — статус «${title}».`,
    `Наберите ${stars} звёзд в «заработано» — статус «${title}».`,
  );
}

const METHODICAL_ROWS: {
  code: string;
  title: string;
  name: string;
  phrase?: string;
}[] = [
  { code: "1", title: "Практик", name: "1 Писательская практика", phrase: "писательская практика" },
  { code: "2", title: "Луковица", name: "2 Луковица", phrase: "луковица" },
  { code: "3", title: "Арка героя", name: "3 Арка" },
  { code: "4", title: "Свита", name: "4 Второстепенные", phrase: "второстепенные" },
  { code: "5", title: "Сеттинг", name: "5 Сеттинги" },
  { code: "6", title: "Знаток жанров", name: "6 Жанр, тропы, клише" },
  { code: "7-1", title: "Структура. Часть 1", name: "7-1 Сценарные структуры" },
  { code: "7-2", title: "Структура. Часть 2", name: "7-2 Сценарные структуры" },
  { code: "8", title: "Высказывание", name: "8 Высказывание" },
  { code: "9", title: "Драматург", name: "9 Драмаргумент", phrase: "драмаргумент" },
  { code: "10", title: "Крючок", name: "10 Крючки" },
  { code: "11", title: "Стиль", name: "11 Стиль" },
  { code: "12", title: "Короткая форма", name: "12 Рассказ" },
  { code: "13", title: "Большая идея", name: "13 Хай-концепт", phrase: "хай-концепт" },
  { code: "14", title: "Одна строка", name: "14 Логлайн" },
  { code: "15", title: "Аннотация", name: "15 Аннотация" },
  { code: "16", title: "Синопсис", name: "16 Синопсис" },
  { code: "17", title: "Публикация", name: "17 Публикация" },
  { code: "18", title: "Своё имя", name: "18 Личный бренд", phrase: "личный бренд" },
  { code: "19-1", title: "Строитель миров", name: "19-1 Библия мира" },
  { code: "19-2", title: "Хранитель мира", name: "19-2 Библия мира" },
];

export const BADGES: BadgeDef[] = [
  {
    id: "first-page",
    title: "Первая страница",
    section: "start",
    sortOrder: 10,
    auto: true,
    image: "/badges/first-page.png",
    ...both("Сдай первое основное задание.", "Сдайте первое основное задание."),
  },
  {
    id: "first-week",
    title: "Первая неделя",
    section: "start",
    sortOrder: 11,
    auto: true,
    image: "/badges/first-week.png",
    ...both("Сдай первое задание недели.", "Сдайте первое задание недели."),
  },
  {
    id: "first-chapter",
    title: "Первая глава",
    section: "start",
    sortOrder: 12,
    auto: true,
    image: "/badges/first-chapter.png",
    ...both(
      "Дождись статуса «принята» у первой главы.",
      "Дождитесь статуса «принята» у первой главы.",
    ),
  },
  {
    id: "ten-tasks",
    title: "Десять заданий",
    section: "practice",
    sortOrder: 40,
    auto: true,
    image: "/badges/ten-tasks.png",
    progress: { kind: "tasks", total: 10 },
    ...both("Сдай 10 основных заданий.", "Сдайте 10 основных заданий."),
  },
  {
    id: "ten-thousand",
    title: "10 000 знаков",
    section: "practice",
    sortOrder: 41,
    auto: false,
    image: "/badges/ten-thousand.png",
    ...same("Текст от 10 000 знаков. Значок ставит Лиза."),
  },
  {
    id: "second-draft",
    title: "Вторая редакция",
    section: "practice",
    sortOrder: 42,
    auto: false,
    image: "/badges/second-draft.png",
    ...same("Текст переписан после разбора. Значок ставит Лиза."),
  },
  {
    id: "book-done",
    title: "Книга закончена",
    section: "practice",
    sortOrder: 43,
    auto: true,
    image: "/badges/book-done.png",
    ...both(
      "Заверши книгу: в журнале звёзд есть «завершение книги».",
      "Завершите книгу: в журнале звёзд есть «завершение книги».",
    ),
  },
  ...METHODICAL_ROWS.map((row, index) => ({
    id: `methodical-${row.code}`,
    title: row.title,
    section: "methodical" as const,
    sortOrder: 100 + index,
    auto: true,
    image: `/badges/methodical-${row.code}.png`,
    code: row.code,
    phrase: row.phrase,
    ...methodicalHint(row.name),
  })),
  {
    id: "first-entry",
    title: "Первая заявка",
    section: "contest",
    sortOrder: 200,
    auto: true,
    image: "/badges/first-entry.png",
    ...both("Отправь первую заявку на конкурс.", "Отправьте первую заявку на конкурс."),
  },
  {
    id: "first-no",
    title: "Первый отказ",
    section: "contest",
    sortOrder: 201,
    auto: true,
    image: "/badges/first-no.png",
    ...both(
      "Получи первый отказ с конкурса. Отказ — часть пути.",
      "Получите первый отказ с конкурса. Отказ — часть пути.",
    ),
  },
  {
    id: "contest-yes",
    title: "Принято",
    section: "contest",
    sortOrder: 202,
    auto: true,
    image: "/badges/contest-yes.png",
    ...both(
      "Дождись статуса «принято» на конкурсе или в журнале.",
      "Дождитесь статуса «принято» на конкурсе или в журнале.",
    ),
  },
  {
    id: "publisher",
    title: "В издательстве",
    section: "contest",
    sortOrder: 203,
    auto: true,
    image: "/badges/publisher.png",
    ...both("Отправь первую заявку в издательство.", "Отправьте первую заявку в издательство."),
  },
  {
    id: "publisher-yes",
    title: "Принято в издательстве",
    section: "contest",
    sortOrder: 204,
    auto: true,
    image: "/badges/publisher-yes.png",
    ...both(
      "Дождись статуса «принято» в издательстве.",
      "Дождитесь статуса «принято» в издательстве.",
    ),
  },
  {
    id: "spark",
    title: "Огонёк",
    section: "streak",
    sortOrder: 230,
    auto: true,
    image: "/badges/spark.png",
    progress: { kind: "streak", total: 4 },
    ...both("Держи серию 4 недели подряд.", "Держите серию 4 недели подряд."),
  },
  {
    id: "candle",
    title: "Свеча",
    section: "streak",
    sortOrder: 231,
    auto: true,
    image: "/badges/candle.png",
    progress: { kind: "streak", total: 8 },
    ...both("Держи серию 8 недель подряд.", "Держите серию 8 недель подряд."),
  },
  {
    id: "lighthouse",
    title: "Маяк",
    section: "streak",
    sortOrder: 232,
    auto: true,
    image: "/badges/lighthouse.png",
    progress: { kind: "streak", total: 12 },
    ...both("Держи серию 12 недель подряд.", "Держите серию 12 недель подряд."),
  },
  {
    id: "back-in-line",
    title: "Снова в строю",
    section: "streak",
    sortOrder: 233,
    auto: true,
    image: "/badges/back-in-line.png",
    ...both(
      "Сдай задание или главу после перерыва от трёх недель.",
      "Сдайте задание или главу после перерыва от трёх недель.",
    ),
  },
  {
    id: "level-5",
    title: "Сочинитель",
    section: "level",
    sortOrder: 260,
    auto: true,
    image: "/badges/level-5.png",
    progress: { kind: "stars", total: 5 },
    ...levelHint("Сочинитель", 5),
  },
  {
    id: "level-25",
    title: "Рассказчик",
    section: "level",
    sortOrder: 261,
    auto: true,
    image: "/badges/level-25.png",
    progress: { kind: "stars", total: 25 },
    ...levelHint("Рассказчик", 25),
  },
  {
    id: "level-70",
    title: "Романист",
    section: "level",
    sortOrder: 262,
    auto: true,
    image: "/badges/level-70.png",
    progress: { kind: "stars", total: 70 },
    ...levelHint("Романист", 70),
  },
  {
    id: "level-100",
    title: "Достоевский",
    section: "level",
    sortOrder: 263,
    auto: true,
    image: "/badges/level-100.png",
    progress: { kind: "stars", total: 100 },
    ...levelHint("Достоевский", 100),
  },
  {
    id: "level-150",
    title: "Живой классик",
    section: "level",
    sortOrder: 264,
    auto: true,
    image: "/badges/level-150.png",
    progress: { kind: "stars", total: 150 },
    ...levelHint("Живой классик", 150),
  },
];

export const BADGE_BY_ID = new Map(BADGES.map((badge) => [badge.id, badge]));

export function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Если методичка уже есть в библиотеке, значок на неё ссылается. Пустую ссылку повторно не затирает. */
export function guideLinkSql(): string {
  return BADGES.filter((badge) => badge.code)
    .map((badge) => {
      const code = badge.code ?? "";
      const checks = [
        `g.title ~ ${sqlLiteral(`^${code}([[:space:].]|$)`)}`,
      ];
      if (badge.phrase) {
        const pretty = badge.phrase.charAt(0).toLocaleUpperCase("ru-RU") + badge.phrase.slice(1);
        checks.push(`g.title ILIKE ${sqlLiteral(`%${badge.phrase}%`)}`);
        checks.push(`g.title ILIKE ${sqlLiteral(`%${pretty}%`)}`);
      }
      return `UPDATE "Badge" b
SET "guideId" = g.id
FROM "Guide" g
WHERE b.id = ${sqlLiteral(badge.id)}
  AND b."guideId" IS NULL
  AND (${checks.join("\n    OR ")});`;
    })
    .join("\n\n");
}

/** Принятое задание с номером или устойчивым названием методички. */
export function methodicalAwardSql(): string {
  return BADGES.filter((badge) => badge.code)
    .map((badge) => {
      const code = badge.code ?? "";
      const checks = [
        `title ~ ${sqlLiteral(`^${code}([[:space:].]|$)`)}`,
        `title ~ ${sqlLiteral(`(м|М)етодичка[[:space:]]+${code}([[:space:].]|$)`)}`,
      ];
      if (badge.phrase) {
        const pretty = badge.phrase.charAt(0).toLocaleUpperCase("ru-RU") + badge.phrase.slice(1);
        checks.push(`title ILIKE ${sqlLiteral(`%${badge.phrase}%`)}`);
        checks.push(`title ILIKE ${sqlLiteral(`%${pretty}%`)}`);
      }
      return `-- ${badge.title}: принято задание по методичке ${code}.
INSERT INTO "BadgeAward" (id, "studentId", "badgeId", source, "awardedAt")
SELECT
  'bf-badge-' || t."studentId" || '-' || ${sqlLiteral(badge.id)},
  t."studentId",
  ${sqlLiteral(badge.id)},
  'AUTO'::"BadgeSource",
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "studentId"
  FROM "Task"
  WHERE status = 'ACCEPTED'
    AND (${checks.join("\n      OR ")})
) t
ON CONFLICT ("studentId", "badgeId") DO NOTHING;`;
    })
    .join("\n\n");
}

/** Строки справочника. Повторный запуск не переписывает уже выданные значки. */
export function catalogueInsertSql(): string {
  const values = BADGES.map(
    (badge) =>
      `  (${sqlLiteral(badge.id)}, ${sqlLiteral(badge.title)}, ${sqlLiteral(badge.hint)}, ${sqlLiteral(badge.hintFormal)}, ${sqlLiteral(badge.section)}, ${sqlLiteral(badge.image)}, ${badge.sortOrder})`,
  ).join(",\n");
  return `INSERT INTO "Badge" (id, title, hint, "hintFormal", section, image, "sortOrder")
VALUES
${values}
ON CONFLICT (id) DO NOTHING;`;
}
