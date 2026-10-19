// Одноразовый перенос месяца из скобок в конце названия книги.
// «Аура, Карлос Фуэнтес (ноябрь 2026, по желанию)» →
// название «Аура, Карлос Фуэнтес», месяц «ноябрь 2026», optional true.
// Скобки, в которых есть что-то ещё, не трогаем: слова некуда деть.
// Повторный вызов ничего не меняет. Уже заполненный месяц не затирается.

const MONTH_WORD =
  "январ[а-яё]*|феврал[а-яё]*|март[а-яё]*|апрел[а-яё]*|ма[йя][а-яё]*|июн[а-яё]*|июл[а-яё]*|август[а-яё]*|сентябр[а-яё]*|октябр[а-яё]*|ноябр[а-яё]*|декабр[а-яё]*";
const YEAR = "[12][0-9]{3}";
const PIECE = `(?:(?:${MONTH_WORD})(?:\\s+${YEAR})?|${YEAR})`;
const MARK = "по\\s+желанию";

const TRAILING = /\s*\(([^)]+)\)\s*$/;
const INNER = new RegExp(
  `^(?:${PIECE}(?:\\s*,\\s*${PIECE})*(?:\\s*,\\s*${MARK})?|${MARK}(?:\\s*,\\s*${PIECE})+|${MARK})$`,
  "i",
);
const MARK_PART = /^по\s+желанию$/i;

export type BookMonthRow = {
  title: string;
  month: string | null;
  optional: boolean;
};

export function moveBookMonth(row: BookMonthRow): BookMonthRow {
  if (row.month?.trim()) return row;
  const match = TRAILING.exec(row.title);
  if (!match) return row;
  const tail = match[1].trim();
  // Флаг i в JS не меняет регистр кириллицы, поэтому сравниваем нижний регистр.
  const tailKey = tail.toLowerCase();
  if (!INNER.test(tailKey)) return row;
  const title = row.title.slice(0, match.index).trim();
  if (!title) return row;
  const monthParts = tail
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !MARK_PART.test(part.toLowerCase()));
  const month = monthParts.join(", ");
  return {
    title,
    month: month || null,
    optional: row.optional || /по\s+желанию/i.test(tailKey),
  };
}
