// Месяц книги хранится строкой «ноябрь 2026». Списки только подставляют
// ту же строку: старые записи, в том числе в родительном («мая 2026»),
// по-прежнему читаются и показываются.

export const BOOK_MONTHS: { id: number; name: string; forms: readonly string[] }[] = [
  { id: 1, name: "январь", forms: ["январь", "января"] },
  { id: 2, name: "февраль", forms: ["февраль", "февраля"] },
  { id: 3, name: "март", forms: ["март", "марта"] },
  { id: 4, name: "апрель", forms: ["апрель", "апреля"] },
  { id: 5, name: "май", forms: ["май", "мая"] },
  { id: 6, name: "июнь", forms: ["июнь", "июня"] },
  { id: 7, name: "июль", forms: ["июль", "июля"] },
  { id: 8, name: "август", forms: ["август", "августа"] },
  { id: 9, name: "сентябрь", forms: ["сентябрь", "сентября"] },
  { id: 10, name: "октябрь", forms: ["октябрь", "октября"] },
  { id: 11, name: "ноябрь", forms: ["ноябрь", "ноября"] },
  { id: 12, name: "декабрь", forms: ["декабрь", "декабря"] },
];

const STORED_MONTH = /^([а-яё]+)\s+([12]\d{3})$/;

export function parseStoredBookMonth(
  value: string | null | undefined,
): { month: number; year: number } | null {
  const text = (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const match = STORED_MONTH.exec(text);
  if (!match) return null;
  const month = BOOK_MONTHS.find((row) => row.forms.includes(match[1]));
  if (!month) return null;
  return { month: month.id, year: Number(match[2]) };
}

export function formatStoredBookMonth(month: number, year: number): string | null {
  const name = BOOK_MONTHS.find((row) => row.id === month)?.name;
  if (!name || !Number.isInteger(year) || year < 1000 || year > 9999) return null;
  return `${name} ${year}`;
}

/** Годы от текущего−5 до текущего+2. Год уже записанной книги остаётся в списке. */
export function bookMonthYears(now: Date, extraYear?: number | null): number[] {
  const current = now.getFullYear();
  const years = new Set<number>();
  for (let year = current - 5; year <= current + 2; year += 1) years.add(year);
  if (extraYear != null && Number.isInteger(extraYear) && extraYear >= 1000 && extraYear <= 9999) {
    years.add(extraYear);
  }
  return [...years].sort((a, b) => a - b);
}
