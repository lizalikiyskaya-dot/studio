import { prisma } from "@/lib/prisma";
import type { QuoteCursor } from "./dailyQuote";

const KEY = "quote-seq";

function missingTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022" || message.includes("MailBroadcast");
}

function parseCursor(raw: string): QuoteCursor | null {
  try {
    const data = JSON.parse(raw) as { date?: unknown; quoteId?: unknown };
    if (typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return null;
    if (typeof data.quoteId !== "string" || !data.quoteId) return null;
    return { date: data.date, quoteId: data.quoteId };
  } catch {
    return null;
  }
}

export async function readQuoteCursor(): Promise<QuoteCursor | null> {
  try {
    const row = await prisma.mailBroadcast.findUnique({ where: { key: KEY }, select: { studentIds: true } });
    if (!row) return null;
    return parseCursor(row.studentIds);
  } catch (error) {
    if (missingTable(error)) return null;
    throw error;
  }
}

/** Якорь дня лежит в уже существующей таблице настроек. Новой колонки нет. */
export async function writeQuoteCursor(cursor: QuoteCursor | null): Promise<void> {
  try {
    if (!cursor) {
      await prisma.mailBroadcast.deleteMany({ where: { key: KEY } });
      return;
    }
    const studentIds = JSON.stringify(cursor);
    await prisma.mailBroadcast.upsert({
      where: { key: KEY },
      create: {
        key: KEY,
        enabled: false,
        timeZone: "Europe/Moscow",
        weekdays: "",
        minute: 0,
        windowMinutes: 0,
        oncePerDay: false,
        audience: "all",
        studentIds,
        sender: "profile",
      },
      update: { studentIds, enabled: false },
    });
  } catch (error) {
    if (missingTable(error)) return;
    throw error;
  }
}
