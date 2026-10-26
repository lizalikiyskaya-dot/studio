import { Prisma } from "@/generated/prisma/client";
import { DAILY_QUOTES, type DailyQuote } from "@/data/dailyQuotes";
import { prisma } from "@/lib/prisma";
import { moscowDateKey, shiftDateKey, shownIndex, type QuoteCursor } from "./dailyQuote";
import { readQuoteCursor, writeQuoteCursor } from "./quoteCursor";

function missingTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

/**
 * Сегодняшняя и завтрашняя цитата по одному правилу для виджета, письма и списка наставника.
 * Выбор дня записывается в якорь, чтобы правка списка не перескочила очередь.
 */
export async function pinDailyQuote<T extends { id: string }>(
  rows: readonly T[],
  date = new Date(),
): Promise<{ today: T | null; tomorrow: T | null }> {
  if (rows.length === 0) return { today: null, tomorrow: null };
  const todayKey = moscowDateKey(date);
  const ids = rows.map((row) => row.id);
  const cursor = await readQuoteCursor();
  const today = rows[shownIndex(ids, cursor, todayKey)];
  const pin: QuoteCursor = { date: todayKey, quoteId: today.id };
  if (!cursor || cursor.date !== pin.date || cursor.quoteId !== pin.quoteId) {
    await writeQuoteCursor(pin);
  }
  const tomorrow = rows[shownIndex(ids, pin, shiftDateKey(todayKey, 1))];
  return { today, tomorrow };
}

export async function loadDailyQuote(date = new Date()): Promise<DailyQuote | null> {
  try {
    const rows = await prisma.dailyQuote.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, text: true, author: true, source: true, translator: true },
    });
    if (rows.length === 0) return null;
    const { today } = await pinDailyQuote(rows, date);
    return today ? toQuote(today) : null;
  } catch (error) {
    if (!missingTable(error)) console.error("[quotes] список из базы недоступен, берём встроенный", error);
    const builtin = DAILY_QUOTES.map((quote, index) => ({ ...quote, id: `builtin:${index}` }));
    const { today } = await pinDailyQuote(builtin, date);
    return today ? toQuote(today) : null;
  }
}

function toQuote(row: { text: string; author: string; source: string; translator?: string | null }): DailyQuote {
  return {
    text: row.text,
    author: row.author,
    source: row.source,
    translator: row.translator || undefined,
  };
}
