"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { mailFrom, sendMail } from "@/lib/mail";
import {
  emptySender,
  envelopeFrom,
  normalizeSender,
  readStoredSender,
  senderWarning,
  smtpPublicFromEnv,
  type MailSenderInput,
} from "@/lib/mailSender";
import { loadDailyQuote } from "@/lib/loadDailyQuote";
import { moscowToday, pickWeekly } from "@/features/weekly/schedule";
import { writeBroadcast } from "@/lib/mailBroadcastStore";
import { composeDraft } from "@/lib/letterCompose";
import { isLetterKey } from "@/lib/letterTemplates";
import { readLetterTemplate, resetLetterTemplate, writeLetterTemplate } from "@/lib/letterTemplateStore";
import { previewLetter } from "@/lib/letterPreview";
import type { BroadcastSetting } from "@/lib/mailBroadcasts";
import {
  MENTOR_SEND_GAP_MS,
  MENTOR_SEND_MAX,
  renderMentorCompose,
  sendInSeries,
  type MentorTemplate,
  type QuoteLetterInput,
  type WeeklyLetterInput,
} from "@/lib/mentorCompose";

const TEMPLATES = new Set<MentorTemplate>(["blank", "platform", "weekly", "quote"]);

async function requireMentor() {
  const session = await getSession();
  if (!session || session.role !== "MENTOR") return null;
  return session;
}

function asTemplate(value: string): MentorTemplate | null {
  return TEMPLATES.has(value as MentorTemplate) ? (value as MentorTemplate) : null;
}

async function letterContext(): Promise<{ weekly: WeeklyLetterInput | null; quote: QuoteLetterInput | null }> {
  let weekly: WeeklyLetterInput | null = null;
  try {
    const tasks = await prisma.weeklyTask.findMany({
      select: { id: true, title: true, prompt: true, lengthHint: true, publishedOn: true },
    });
    const picked = pickWeekly(tasks, moscowToday());
    if (picked.current) {
      weekly = {
        title: picked.current.title,
        prompt: picked.current.prompt,
        lengthHint: picked.current.lengthHint,
        publishedOn: picked.current.publishedOn,
        nextPublishedOn: picked.upcoming?.publishedOn ?? null,
      };
    }
  } catch {
    weekly = null;
  }
  const row = await loadDailyQuote();
  return { weekly, quote: row ? { text: row.text, author: row.author, source: row.source } : null };
}

export async function loadTemplateDraft(templateName: string) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник собирает письмо." };
  const template = asTemplate(templateName);
  if (!template) return { error: "Такого шаблона нет." };
  const context = await letterContext();
  const key = template === "platform" ? "platform" : template === "weekly" ? "weekly-task" : template === "quote" ? "daily-quote" : null;
  const stored = key ? await readLetterTemplate(key) : null;
  return composeDraft(template, context.weekly, context.quote, stored);
}

export async function previewMentorMail(input: {
  template: string;
  subject: string;
  body: string;
  studentId: string;
}) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник может смотреть это письмо." };
  const template = asTemplate(input.template);
  if (!template) return { error: "Такого шаблона нет." };
  const student = await prisma.user.findFirst({
    where: { id: input.studentId, role: "STUDENT", status: "APPROVED" },
    select: { name: true },
  });
  if (!student) return { error: "Выберите ученика с открытым доступом." };
  const context = await letterContext();
  const key = template === "platform" ? "platform" : template === "weekly" ? "weekly-task" : template === "quote" ? "daily-quote" : null;
  const stored = key ? await readLetterTemplate(key) : null;
  const letter = renderMentorCompose({
    template,
    subject: input.subject,
    body: input.body,
    name: student.name,
    weekly: context.weekly,
    quote: context.quote,
    stored,
  });
  return { subject: letter.subject, html: letter.html };
}

const sending = new Set<string>();

export async function sendMentorMail(input: {
  template: string;
  subject: string;
  body: string;
  studentIds: string[];
  fromChoice?: "env" | "profile";
}) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник может отправить письмо." };
  const template = asTemplate(input.template);
  if (!template) return { error: "Такого шаблона нет." };
  const ids = [...new Set(input.studentIds.filter((id) => typeof id === "string" && id))];
  if (ids.length === 0) return { error: "Выберите хотя бы одного ученика." };
  if (ids.length > MENTOR_SEND_MAX) {
    return { error: `За один раз не больше ${MENTOR_SEND_MAX} писем. Снимите лишние галочки.` };
  }
  if (!input.subject.trim()) return { error: "Нужна тема письма." };
  if (template === "blank" && !input.body.trim()) return { error: "Напишите текст письма." };

  const students = await prisma.user.findMany({
    where: { id: { in: ids }, role: "STUDENT", status: "APPROVED" },
    select: { id: true, name: true, email: true },
  });
  if (students.length !== ids.length) return { error: "В списке есть не ученик. Отправка остановлена." };
  if (students.some((student) => !student.email.includes("@"))) {
    return { error: "У кого-то из учеников нет почты." };
  }

  const context = await letterContext();
  if (template === "weekly" && !context.weekly) return { error: "Задания недели ещё нет." };
  if (template === "quote" && !context.quote) return { error: "Цитаты на сегодня нет." };
  if (sending.has(session.userId)) return { error: "Предыдущая пачка ещё уходит." };
  sending.add(session.userId);
  const storedSender = await readStoredSender();
  const envelope = envelopeFrom(storedSender, mailFrom());
  const letterKey = template === "platform" ? "platform" : template === "weekly" ? "weekly-task" : template === "quote" ? "daily-quote" : null;
  const storedLetter = letterKey ? await readLetterTemplate(letterKey) : null;
  let sent = 0;
  let failed = 0;
  try {
    await sendInSeries(students, MENTOR_SEND_GAP_MS, async (student) => {
      const letter = renderMentorCompose({
        template,
        subject: input.subject,
        body: input.body,
        name: student.name,
        weekly: context.weekly,
        quote: context.quote,
        stored: storedLetter,
      });
      const ok = await sendMail({
        to: student.email,
        subject: letter.subject,
        html: letter.html,
        text: letter.text,
        type: letter.type,
        recipientUserId: student.id,
        from: envelope.from,
        replyTo: envelope.replyTo,
      });
      if (ok) sent += 1;
      else failed += 1;
    });
  } finally {
    sending.delete(session.userId);
  }
  revalidatePath("/mentor/mail");
  return { sent, failed };
}

export async function saveBroadcast(input: BroadcastSetting) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник меняет рассылку." };
  const result = await writeBroadcast(input);
  if (result.error) return { error: result.error };
  revalidatePath("/mentor/mail");
  return { ok: true as const };
}

export async function saveMailSender(input: MailSenderInput) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник меняет адрес отправителя." };
  const parsed = normalizeSender(input);
  if (parsed.error) return { error: parsed.error };
  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        mailFromName: parsed.value.fromName,
        mailFromEmail: parsed.value.fromEmail,
        mailReplyTo: parsed.value.replyTo,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("mailFrom") || message.includes("mailReplyTo") || message.includes("P2022")) {
      return { error: "Столбцов ещё нет. Нужен файл docs/sql/2026-10-20-mail-from.sql." };
    }
    throw error;
  }
  revalidatePath("/mentor/profile");
  revalidatePath("/mentor/mail");
  const warning = senderWarning(parsed.value, smtpPublicFromEnv());
  return { ok: true, warning };
}

export async function loadMailSender(): Promise<{ ready: boolean; sender: MailSenderInput }> {
  const session = await requireMentor();
  if (!session) return { ready: false, sender: emptySender() };
  try {
    const row = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { mailFromName: true, mailFromEmail: true, mailReplyTo: true },
    });
    if (!row) return { ready: false, sender: emptySender() };
    return {
      ready: true,
      sender: { fromName: row.mailFromName, fromEmail: row.mailFromEmail, replyTo: row.mailReplyTo },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("mailFrom") || message.includes("mailReplyTo") || message.includes("P2022")) {
      return { ready: false, sender: emptySender() };
    }
    throw error;
  }
}

export async function saveLetterTemplateAction(key: string, subject: string, body: string) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник меняет шаблон." };
  if (!isLetterKey(key)) return { error: "Такого шаблона нет." };
  const result = await writeLetterTemplate(key, { subject, body });
  if (result.error) return { error: result.error };
  revalidatePath("/mentor/mail");
  return { ok: true as const };
}

export async function resetLetterTemplateAction(key: string) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник меняет шаблон." };
  if (!isLetterKey(key)) return { error: "Такого шаблона нет." };
  const result = await resetLetterTemplate(key);
  if (result.error) return { error: result.error };
  revalidatePath("/mentor/mail");
  return { ok: true as const };
}

export async function previewLetterTemplate(key: string, subject: string, body: string) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник смотрит шаблон." };
  if (!isLetterKey(key)) return { error: "Такого шаблона нет." };
  const letter = previewLetter(key, { subject, body });
  return { subject: letter.subject, html: letter.html };
}
