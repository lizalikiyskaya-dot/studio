import { Prisma } from "@/generated/prisma/client";
import type { DailyQuote } from "@/data/dailyQuotes";
import { prisma } from "@/lib/prisma";
import { quoteForDate } from "./dailyQuote";

function missingTable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

/**
 * Цитата на сегодня из списка наставника.
 * Пустой список — ничего не показываем.
 * Таблицы ещё нет — остаётся встроенный список, кабинет не падает.
 */
export async function loadDailyQuote(date = new Date()): Promise<DailyQuote | null> {
  try {
    const rows = await prisma.dailyQuote.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { text: true, author: true, source: true, translator: true },
    });
    if (rows.length === 0) return null;
    return quoteForDate(
      date,
      rows.map((row) => ({
        text: row.text,
        author: row.author,
        source: row.source,
        translator: row.translator || undefined,
      })),
    );
  } catch (error) {
    if (!missingTable(error)) console.error("[quotes] список из базы недоступен, берём встроенный", error);
    return quoteForDate(date);
  }
}
