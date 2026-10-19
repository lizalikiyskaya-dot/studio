import { DAILY_QUOTES, type DailyQuote } from "@/data/dailyQuotes";

/** Календарный день по Москве: одна и та же цитата у всех в эти сутки. */
export function moscowDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function quoteIndexForDate(date: Date, length: number): number {
  if (length <= 0) return 0;
  const [year, month, day] = moscowDateKey(date).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000) % length;
}

export function quoteForDate(date = new Date(), quotes: readonly DailyQuote[] = DAILY_QUOTES): DailyQuote {
  const list = quotes.length > 0 ? quotes : DAILY_QUOTES;
  return list[quoteIndexForDate(date, list.length)];
}
