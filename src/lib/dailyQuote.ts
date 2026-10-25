import { DAILY_QUOTES, type DailyQuote } from "@/data/dailyQuotes";

/** Первый день списка: 20 октября 2026 — первая цитата. Дальше курсор, не остаток от эпохи. */
export const QUOTE_EPOCH = "2026-10-20";

export type QuoteCursor = { date: string; quoteId: string };

/** Календарный день по Москве: одна и та же цитата у всех в эти сутки. */
export function moscowDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetweenDateKeys(from: string, to: string): number {
  const day = (key: string) => {
    const [year, month, date] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, date) / 86_400_000;
  };
  return day(to) - day(from);
}

function mod(value: number, length: number): number {
  if (length <= 0) return 0;
  return ((value % length) + length) % length;
}

/**
 * Индекс цитаты на дату.
 * Курсор помнит, какая строка уже выбрана на свой день. Следующий день — следующая строка
 * текущего списка. Без курсора отсчёт идёт от 20 октября 2026, с первой цитаты.
 */
export function shownIndex(ids: readonly string[], cursor: QuoteCursor | null, dateKey: string): number {
  if (ids.length === 0) return 0;
  const pos = cursor ? ids.indexOf(cursor.quoteId) : -1;
  if (cursor && pos >= 0) {
    const delta = daysBetweenDateKeys(cursor.date, dateKey);
    if (delta <= 0) return pos;
    return mod(pos + delta, ids.length);
  }
  return mod(daysBetweenDateKeys(QUOTE_EPOCH, dateKey), ids.length);
}

/** После правки списка сегодняшняя цитата остаётся, если она ещё есть. Удалённую сменяет следующая за ней. */
export function reanchorAfterEdit(
  oldIds: readonly string[],
  newIds: readonly string[],
  cursor: QuoteCursor | null,
  dateKey: string,
): QuoteCursor | null {
  if (newIds.length === 0) return null;
  if (oldIds.length === 0) {
    return { date: dateKey, quoteId: newIds[shownIndex(newIds, null, dateKey)] };
  }
  const index = shownIndex(oldIds, cursor, dateKey);
  const shownId = oldIds[index];
  if (shownId && newIds.includes(shownId)) return { date: dateKey, quoteId: shownId };
  if (shownId) {
    const start = oldIds.indexOf(shownId);
    for (let step = 1; step <= oldIds.length; step++) {
      const candidate = oldIds[mod(start + step, oldIds.length)];
      if (newIds.includes(candidate)) return { date: dateKey, quoteId: candidate };
    }
  }
  return { date: dateKey, quoteId: newIds[Math.min(index, newIds.length - 1)] };
}

export function quoteForDate(date = new Date(), quotes: readonly DailyQuote[] = DAILY_QUOTES): DailyQuote {
  const list = quotes.length > 0 ? quotes : DAILY_QUOTES;
  const ids = list.map((_, index) => String(index));
  return list[shownIndex(ids, null, moscowDateKey(date))];
}
