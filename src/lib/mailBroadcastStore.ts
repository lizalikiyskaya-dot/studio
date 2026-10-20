import { prisma } from "@/lib/prisma";
import { mailFrom } from "@/lib/mail";
import { envelopeFrom, readStoredSender } from "@/lib/mailSender";
import {
  BROADCAST_KEYS,
  BROADCAST_META,
  audienceAllows,
  defaultBroadcast,
  isBroadcastKey,
  normalizeBroadcast,
  type BroadcastKey,
  type BroadcastSetting,
  type BroadcastWho,
} from "@/lib/mailBroadcasts";

export type BroadcastRead =
  | { legacy: true }
  | { legacy: false; setting: BroadcastSetting };

function missingTable(error: unknown, name: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022" || message.includes(name);
}

function fromRow(row: {
  key: string;
  enabled: boolean;
  timeZone: string;
  weekdays: string;
  hour: number | null;
  minute: number;
  windowMinutes: number;
  oncePerDay: boolean;
  audience: string;
  studentIds: string;
  sender: string;
}): BroadcastSetting {
  const key = isBroadcastKey(row.key) ? row.key : "payment";
  const parsed = normalizeBroadcast({
    key,
    enabled: row.enabled,
    timeZone: row.timeZone === "Asia/Seoul" ? "Asia/Seoul" : "Europe/Moscow",
    weekdays: row.weekdays,
    hour: row.hour,
    minute: row.minute,
    windowMinutes: row.windowMinutes,
    oncePerDay: row.oncePerDay,
    audience: row.audience === "chosen" ? "chosen" : "all",
    studentIds: row.studentIds,
    sender: row.sender === "env" ? "env" : "profile",
  });
  return parsed.value;
}

export async function readBroadcast(key: BroadcastKey): Promise<BroadcastRead> {
  try {
    const row = await prisma.mailBroadcast.findUnique({ where: { key } });
    if (!row) return { legacy: false, setting: defaultBroadcast(key) };
    return { legacy: false, setting: fromRow(row) };
  } catch (error) {
    if (missingTable(error, "MailBroadcast")) return { legacy: true };
    throw error;
  }
}

export async function readBroadcastList(): Promise<{ ready: boolean; rows: BroadcastSetting[] }> {
  try {
    const stored = await prisma.mailBroadcast.findMany();
    const byKey = new Map(stored.map((row) => [row.key, row]));
    return {
      ready: true,
      rows: BROADCAST_KEYS.map((key) => {
        const row = byKey.get(key);
        return row ? fromRow(row) : defaultBroadcast(key);
      }),
    };
  } catch (error) {
    if (missingTable(error, "MailBroadcast")) {
      return { ready: false, rows: BROADCAST_KEYS.map((key) => defaultBroadcast(key)) };
    }
    throw error;
  }
}

export async function writeBroadcast(input: BroadcastSetting): Promise<{ error?: string }> {
  const parsed = normalizeBroadcast(input);
  if (parsed.error) return { error: parsed.error };
  const value = parsed.value;
  try {
    const { key, ...data } = value;
    await prisma.mailBroadcast.upsert({
      where: { key },
      create: value,
      update: data,
    });
  } catch (error) {
    if (missingTable(error, "MailBroadcast")) {
      return { error: "Таблицы ещё нет. Нужен файл docs/sql/2026-10-20-mail-broadcast.sql." };
    }
    throw error;
  }
  return {};
}

export function whoFor(key: BroadcastKey): BroadcastWho {
  return BROADCAST_META.find((item) => item.key === key)?.who ?? "person";
}

/** false: письмо не слать. legacy (таблицы нет) считает включённым то, что включено по умолчанию. */
export async function broadcastOpen(key: BroadcastKey, studentId?: string): Promise<{ ok: boolean; setting: BroadcastSetting | null }> {
  const read = await readBroadcast(key);
  const setting = read.legacy ? defaultBroadcast(key) : read.setting;
  if (!setting.enabled) return { ok: false, setting };
  if (!audienceAllows(setting, studentId, whoFor(key))) return { ok: false, setting };
  return { ok: true, setting };
}

export async function envelopeFor(sender: "env" | "profile"): Promise<{ from: string; replyTo?: string }> {
  if (sender === "env") return { from: mailFrom() };
  return envelopeFrom(await readStoredSender(), mailFrom());
}
