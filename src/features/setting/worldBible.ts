import type { WorldCategory } from "@/generated/prisma/client";

export const GRAPES_FIELDS = [
  "grapesGeography",
  "grapesReligion",
  "grapesAchievements",
  "grapesPolitics",
  "grapesEconomy",
  "grapesSocial",
] as const;

export type GrapesField = (typeof GRAPES_FIELDS)[number];

export type GrapesBag = Record<GrapesField, string>;

export const ENTRY_CATEGORIES = [
  "LOCATIONS",
  "FACTIONS",
  "LORE",
  "TECHNOLOGY",
  "MAGIC",
  "HISTORY",
  "CREATURES",
  "LANGUAGES",
] as const satisfies readonly WorldCategory[];

export type Fill = "empty" | "partial" | "full";

export type BibleTheme = {
  id: string;
  label: string;
  badge?: "G" | "R" | "A" | "P" | "E" | "S";
  hints: string[];
  kind: "grapes" | "entry";
  field?: GrapesField;
  category?: WorldCategory;
};

const GRAPES_THEMES: BibleTheme[] = [
  {
    id: "grapesGeography",
    label: "География",
    badge: "G",
    kind: "grapes",
    field: "grapesGeography",
    hints: [
      "Какая земля, вода и погода?",
      "Где люди селятся и почему?",
      "Что помогает дороге и что её режет?",
      "Чего здесь не хватает?",
    ],
  },
  {
    id: "grapesReligion",
    label: "Религия",
    badge: "R",
    kind: "grapes",
    field: "grapesReligion",
    hints: [
      "Во что здесь верят?",
      "Какие обряды повторяют?",
      "Чего нельзя делать?",
      "Кто следит за запретом?",
    ],
  },
  {
    id: "grapesAchievements",
    label: "Достижения",
    badge: "A",
    kind: "grapes",
    field: "grapesAchievements",
    hints: [
      "Что этот народ умеет?",
      "Чем здесь гордятся?",
      "Что помнят дольше всего?",
      "Чего ещё не сумели?",
    ],
  },
  {
    id: "grapesPolitics",
    label: "Политика",
    badge: "P",
    kind: "grapes",
    field: "grapesPolitics",
    hints: [
      "Кто здесь решает?",
      "Как спорят и чем кончается спор?",
      "Кого не пускают?",
      "Какой закон знают все?",
    ],
  },
  {
    id: "grapesEconomy",
    label: "Экономика",
    badge: "E",
    kind: "grapes",
    field: "grapesEconomy",
    hints: [
      "Чем здесь платят?",
      "Что дорого?",
      "Откуда еда и вещи?",
      "Кому достаётся лишнее?",
    ],
  },
  {
    id: "grapesSocial",
    label: "Соц. структура",
    badge: "S",
    kind: "grapes",
    field: "grapesSocial",
    hints: [
      "Кто с кем живёт?",
      "Кто главный в доме?",
      "Кем здесь быть нельзя?",
      "Как относятся к гостю?",
    ],
  },
];

const ENTRY_THEMES: BibleTheme[] = [
  {
    id: "LOCATIONS",
    label: "Места",
    kind: "entry",
    category: "LOCATIONS",
    hints: [
      "Кто тут живёт?",
      "Чем пахнет?",
      "Почему сюда приезжают?",
      "Что здесь нельзя трогать?",
      "Куда ведёт дорога отсюда?",
    ],
  },
  {
    id: "FACTIONS",
    label: "Фракции",
    kind: "entry",
    category: "FACTIONS",
    hints: [
      "Кто входит в эту группу?",
      "Чего они хотят?",
      "С кем они в ссоре?",
      "Как их узнать с виду?",
    ],
  },
  {
    id: "LORE",
    label: "Мифы и легенды",
    kind: "entry",
    category: "LORE",
    hints: [
      "Какую легенду знает каждый ребёнок?",
      "Что в ней правда, а что нет?",
      "Кому выгодно, чтобы в неё верили?",
      "Есть ли пророчество или запрет, связанный с сюжетом?",
    ],
  },
  {
    id: "TECHNOLOGY",
    label: "Технологии",
    kind: "entry",
    category: "TECHNOLOGY",
    hints: [
      "Как это устроено?",
      "Кто умеет этим пользоваться?",
      "Что ломается первым?",
      "Без чего оно не работает?",
    ],
  },
  {
    id: "MAGIC",
    label: "Магия",
    kind: "entry",
    category: "MAGIC",
    hints: [
      "Откуда берётся сила?",
      "Кто умеет ей пользоваться?",
      "Какое правило нельзя нарушить?",
      "Чем за это платят?",
    ],
  },
  {
    id: "HISTORY",
    label: "История",
    kind: "entry",
    category: "HISTORY",
    hints: [
      "Что случилось?",
      "Кто это помнит?",
      "Что изменилось после?",
      "О чём здесь не говорят?",
    ],
  },
  {
    id: "CREATURES",
    label: "Существа",
    kind: "entry",
    category: "CREATURES",
    hints: [
      "Где оно живёт?",
      "Чего оно хочет?",
      "Чем опасно?",
      "Как его узнают?",
    ],
  },
  {
    id: "LANGUAGES",
    label: "Языки",
    kind: "entry",
    category: "LANGUAGES",
    hints: [
      "Кто так говорит?",
      "Какое слово нельзя перевести?",
      "Как обращаются к старшему?",
      "Что выдаёт чужака?",
    ],
  },
];

export const BIBLE_THEMES: BibleTheme[] = [...GRAPES_THEMES, ...ENTRY_THEMES];

export function entryLabel(category: WorldCategory) {
  return ENTRY_THEMES.find((theme) => theme.category === category)?.label ?? category;
}

export function isEntryCategory(value: string): value is WorldCategory {
  return (ENTRY_CATEGORIES as readonly string[]).includes(value);
}

const CHECK_LINE = /^(\s*)- \[([ xX])\](.*)$/;

/** Переключает markdown-пункт «- [ ]» / «- [x]». Обычную строку не трогает. */
export function toggleCheckLine(text: string, index: number): string {
  const lines = text.split("\n");
  const line = lines[index];
  if (line == null) return text;
  const match = line.match(CHECK_LINE);
  if (!match) return text;
  const mark = match[2].toLowerCase() === "x" ? " " : "x";
  lines[index] = `${match[1]}- [${mark}]${match[3]}`;
  return lines.join("\n");
}

/** Ключ заметки темы: таблица GRAPES и id карточки. */
export function themeNoteKey(settingKey: string, theme: string) {
  return `${settingKey}\u0000${theme}`;
}

export function appendCheckLine(text: string): string {
  const trimmed = text.replace(/\s+$/, "");
  return trimmed ? `${trimmed}\n- [ ] ` : "- [ ] ";
}

export function grapesFill(text: string): Fill {
  return text.trim() ? "full" : "empty";
}

export function entriesFill(bodies: string[]): Fill {
  if (bodies.length === 0) return "empty";
  const filled = bodies.filter((body) => body.trim()).length;
  if (filled === 0) return "partial";
  if (filled === bodies.length) return "full";
  return "partial";
}

export function themeFill(theme: BibleTheme, grapes: GrapesBag, bodiesByCategory: Map<WorldCategory, string[]>): Fill {
  if (theme.kind === "grapes" && theme.field) return grapesFill(grapes[theme.field] ?? "");
  if (theme.category) return entriesFill(bodiesByCategory.get(theme.category) ?? []);
  return "empty";
}

/** Первая пустая тема, иначе первая недописанная. */
export function nextThemeCue(grapes: GrapesBag, entries: { category: WorldCategory; body: string }[], showEntries: boolean): string | null {
  const bodies = new Map<WorldCategory, string[]>();
  for (const entry of entries) {
    const list = bodies.get(entry.category) ?? [];
    list.push(entry.body);
    bodies.set(entry.category, list);
  }
  const themes = showEntries ? BIBLE_THEMES : GRAPES_THEMES;
  for (const theme of themes) {
    const fill = themeFill(theme, grapes, bodies);
    if (fill === "empty") return `${theme.label} пусто`;
    if (fill === "partial") return `у темы «${theme.label}» есть запись без текста`;
  }
  return null;
}
