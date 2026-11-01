import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mail";
import { defaultBroadcast } from "@/lib/mailBroadcasts";
import { envelopeFor, readBroadcast } from "@/lib/mailBroadcastStore";
import { optOutSecret, signOptOut } from "@/lib/mailOptOut";
import {
  deliverNoteReminders,
  noteReminderDryRun,
  planNoteReminders,
  type NoteReminderPlan,
  type NoteReminderRunResult,
  type ReminderNote,
  type ReminderSend,
  type ReminderStudent,
} from "@/lib/noteReminders";

const LOCK_KEY = 8710231842020;

function missingTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022" || message.includes("NoteReminderSend");
}

async function withLock<T>(fn: () => Promise<T>): Promise<T | null> {
  const rows = await prisma.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked
  `;
  if (!rows[0]?.locked) return null;
  try {
    return await fn();
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

async function listStudents(): Promise<ReminderStudent[]> {
  return prisma.user.findMany({
    where: { role: "STUDENT", status: "APPROVED" },
    select: { id: true, name: true, email: true, status: true, emailNotifications: true },
  });
}

async function listOpenMentorNotes(): Promise<ReminderNote[]> {
  return prisma.note.findMany({
    where: { resolved: false, authorRole: "MENTOR" },
    select: {
      id: true,
      studentId: true,
      authorRole: true,
      resolved: true,
      createdAt: true,
      anchorLabel: true,
      anchorUrl: true,
    },
  });
}

async function recentSends(since: Date): Promise<ReminderSend[]> {
  return prisma.noteReminderSend.findMany({
    where: { sentAt: { gte: since } },
    select: { noteId: true, sentAt: true },
  });
}

async function bookTitles(): Promise<Map<string, string>> {
  const books = await prisma.book.findMany({ select: { id: true, title: true } });
  return new Map(books.map((book) => [book.id, book.title]));
}

function noteUnsubscribeUrl(studentId: string): string | null {
  const secret = optOutSecret();
  if (!secret) return null;
  return `${appUrl()}/unsubscribe?token=${signOptOut(studentId, "mail", secret)}`;
}

const idle = (dryRun: boolean, skipped: NoteReminderRunResult["skipped"]): NoteReminderRunResult => ({
  planned: 0,
  sent: 0,
  alreadySent: 0,
  failed: 0,
  dryRun,
  skipped,
});

/** Кому ушло бы письмо прямо сейчас. Включённость рассылки и утреннее окно не прячут список. */
export async function loadNoteReminderPreview(now = new Date()): Promise<NoteReminderPlan[]> {
  const gate = await readBroadcast("note-reminder");
  const setting = gate.legacy ? defaultBroadcast("note-reminder") : gate.setting;
  const [students, notes, books] = await Promise.all([listStudents(), listOpenMentorNotes(), bookTitles()]);
  let sends: ReminderSend[] = [];
  try {
    sends = await recentSends(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000));
  } catch (error) {
    if (!missingTable(error)) throw error;
  }
  return planNoteReminders({
    now,
    setting,
    students,
    notes,
    sends,
    bookTitles: books,
    baseUrl: appUrl(),
    ignoreSchedule: true,
    unsubscribeUrl: noteUnsubscribeUrl,
  }).plans;
}

/** Один прогон. Живые письма только в продакшене, когда рассылка включена. */
export async function runScheduledNoteReminders(now = new Date()): Promise<NoteReminderRunResult | null> {
  const gate = await readBroadcast("note-reminder");
  const setting = gate.legacy ? defaultBroadcast("note-reminder") : gate.setting;
  const dryRun = noteReminderDryRun();
  if (!setting.enabled) return idle(true, "disabled");
  const envelope = await envelopeFor(setting.sender);
  return withLock(async () => {
    const [students, notes, books] = await Promise.all([listStudents(), listOpenMentorNotes(), bookTitles()]);
    let sends: ReminderSend[] = [];
    try {
      sends = await recentSends(new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000));
    } catch (error) {
      if (missingTable(error)) return idle(dryRun, "no-table");
      throw error;
    }
    return deliverNoteReminders({
      now,
      setting,
      students,
      notes,
      sends,
      bookTitles: books,
      baseUrl: appUrl(),
      dryRun,
      unsubscribeUrl: noteUnsubscribeUrl,
      send: (input) =>
        sendMail({
          ...input,
          from: envelope.from,
          replyTo: envelope.replyTo,
        }),
      record: async (studentId, noteIds) => {
        await prisma.noteReminderSend.createMany({
          data: noteIds.map((noteId) => ({ id: randomUUID(), studentId, noteId })),
        });
      },
    });
  });
}
