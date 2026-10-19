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

export function quoteForDate(date = new Date()): DailyQuote {
  const [year, month, day] = moscowDateKey(date).split("-").map(Number);
  const index = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000) % DAILY_QUOTES.length;
  return DAILY_QUOTES[index];
}
