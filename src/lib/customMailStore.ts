import { prisma } from "@/lib/prisma";
import { parseCustomMailing, type CustomMailingInput, type CustomMailingRow } from "@/lib/customMailPlan";

export type { CustomMailingRow };

function missingTable(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  return code === "P2021" || code === "P2022";
}

function fromDb(row: {
  id: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  cadence: string;
  runOn: string;
  weekday: number;
  monthDay: number;
  hour: number;
  minute: number;
  audience: string;
  studentIds: string;
}): CustomMailingRow | null {
  const parsed = parseCustomMailing(row);
  if (!parsed.ok) return null;
  return { id: row.id, ...parsed.value, enabled: row.enabled };
}

export async function readCustomMailings(): Promise<{ ready: boolean; rows: CustomMailingRow[] }> {
  try {
    const rows = await prisma.customMailing.findMany({ orderBy: { createdAt: "desc" } });
    return { ready: true, rows: rows.flatMap((row) => {
      const view = fromDb(row);
      return view ? [view] : [];
    }) };
  } catch (error) {
    if (missingTable(error)) return { ready: false, rows: [] };
    throw error;
  }
}

export async function writeCustomMailing(id: string | null, input: CustomMailingInput): Promise<{ error: string } | { row: CustomMailingRow }> {
  const parsed = parseCustomMailing(input);
  if (!parsed.ok) return { error: parsed.error };
  const data = parsed.value;
  try {
    const row = id
      ? await prisma.customMailing.update({ where: { id }, data })
      : await prisma.customMailing.create({ data });
    const view = fromDb(row);
    if (!view) return { error: "Не получилось сохранить рассылку." };
    return { row: view };
  } catch (error) {
    if (missingTable(error)) return { error: "Таблицы ещё нет. Нужен файл docs/sql/2026-11-01-custom-mailing.sql." };
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code === "P2025") return { error: "Этой рассылки уже нет." };
    throw error;
  }
}

export async function removeCustomMailing(id: string): Promise<{ error?: string }> {
  try {
    await prisma.customMailing.delete({ where: { id } });
    return {};
  } catch (error) {
    if (missingTable(error)) return { error: "Таблицы ещё нет. Нужен файл docs/sql/2026-11-01-custom-mailing.sql." };
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code === "P2025") return {};
    throw error;
  }
}
