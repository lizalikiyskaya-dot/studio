import { prisma } from "@/lib/prisma";
import {
  LETTER_KEYS,
  applyLetterTemplate,
  cleanDraft,
  isLetterKey,
  letterSpec,
  letterStorageKey,
  sameAsStandard,
  standardDraft,
  type LetterDraft,
  type LetterKey,
  type LetterOutput,
} from "@/lib/letterTemplates";

function missingTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022" || message.includes("MailBroadcast");
}

function parseDraft(raw: string): LetterDraft | null {
  try {
    const data = JSON.parse(raw) as { subject?: unknown; body?: unknown };
    if (typeof data.subject !== "string" || typeof data.body !== "string") return null;
    const cleaned = cleanDraft({ subject: data.subject, body: data.body });
    return cleaned.value ?? null;
  } catch {
    return null;
  }
}

export async function readLetterTemplate(key: LetterKey): Promise<LetterDraft | null> {
  try {
    const row = await prisma.mailBroadcast.findUnique({ where: { key: letterStorageKey(key) } });
    if (!row) return null;
    const draft = parseDraft(row.studentIds);
    if (!draft || sameAsStandard(key, draft)) return null;
    return draft;
  } catch (error) {
    if (missingTable(error)) return null;
    throw error;
  }
}

export type LetterEditorRow = {
  key: LetterKey;
  title: string;
  placeholders: string;
  standardSubject: string;
  standardBody: string;
  subject: string;
  body: string;
  custom: boolean;
};

export async function readLetterEditor(): Promise<{ ready: boolean; rows: LetterEditorRow[] }> {
  let stored = new Map<string, string>();
  let ready = true;
  try {
    const rows = await prisma.mailBroadcast.findMany({
      where: { key: { startsWith: "letter:" } },
      select: { key: true, studentIds: true },
    });
    stored = new Map(rows.map((row) => [row.key, row.studentIds]));
  } catch (error) {
    if (!missingTable(error)) throw error;
    ready = false;
  }
  return {
    ready,
    rows: LETTER_KEYS.map((key) => {
      const standard = standardDraft(key);
      const spec = letterSpec(key);
      const draft = parseDraft(stored.get(letterStorageKey(key)) ?? "");
      const custom = Boolean(draft && !sameAsStandard(key, draft));
      return {
        key,
        title: spec.title,
        placeholders: spec.placeholders.map((name) => `{${name}}`).join(" "),
        standardSubject: standard.subject,
        standardBody: standard.body,
        subject: custom && draft ? draft.subject : standard.subject,
        body: custom && draft ? draft.body : standard.body,
        custom,
      };
    }),
  };
}

/** Совпадение со стандартом удаляет строку. Новых столбцов нет: JSON лежит в studentIds. */
export async function writeLetterTemplate(key: LetterKey, draft: LetterDraft): Promise<{ error?: string }> {
  const cleaned = cleanDraft(draft);
  if (!cleaned.value) return { error: cleaned.error ?? "Проверьте тему и текст." };
  try {
    if (sameAsStandard(key, cleaned.value)) {
      await prisma.mailBroadcast.deleteMany({ where: { key: letterStorageKey(key) } });
      return {};
    }
    const studentIds = JSON.stringify(cleaned.value);
    await prisma.mailBroadcast.upsert({
      where: { key: letterStorageKey(key) },
      create: {
        key: letterStorageKey(key),
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
      update: { studentIds },
    });
  } catch (error) {
    if (missingTable(error)) return { error: "Таблицы ещё нет. Нужен файл docs/sql/2026-10-20-mail-broadcast.sql." };
    throw error;
  }
  return {};
}

export async function resetLetterTemplate(key: LetterKey): Promise<{ error?: string }> {
  try {
    await prisma.mailBroadcast.deleteMany({ where: { key: letterStorageKey(key) } });
  } catch (error) {
    if (missingTable(error)) return { error: "Таблицы ещё нет. Нужен файл docs/sql/2026-10-20-mail-broadcast.sql." };
    throw error;
  }
  return {};
}

export async function dressLetter(key: LetterKey, designed: LetterOutput, vars: Record<string, string>): Promise<LetterOutput> {
  const stored = await readLetterTemplate(key);
  return applyLetterTemplate(key, stored, designed, vars);
}

export function letterKeyFromStorage(value: string): LetterKey | null {
  if (!value.startsWith("letter:")) return null;
  const key = value.slice("letter:".length);
  return isLetterKey(key) ? key : null;
}
