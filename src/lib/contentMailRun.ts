import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mail";
import { dailyQuoteLetter, weeklyTaskLetter } from "@/lib/notify";
import { loadDailyQuote } from "@/lib/loadDailyQuote";
import { moscowToday, pickWeekly } from "@/features/weekly/schedule";
import { defaultBroadcast } from "@/lib/mailBroadcasts";
import { envelopeFor, readBroadcast } from "@/lib/mailBroadcastStore";
import { optOutSecret, signOptOut } from "@/lib/mailOptOut";
import { deliverContentMail, sentMarker, type ContentStudent } from "@/lib/contentMail";
import { withAddress } from "@/lib/addressForm";
import { applyLetterTemplate, weeklyVolume, weeklyWhen } from "@/lib/letterTemplates";
import { readLetterTemplate } from "@/lib/letterTemplateStore";

function missingColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022" || message.includes("weeklyEmails") || message.includes("quoteEmails");
}

async function listStudents(): Promise<ContentStudent[]> {
  return prisma.user.findMany({
    where: { role: "STUDENT", status: "APPROVED" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      emailNotifications: true,
      weeklyEmails: true,
      quoteEmails: true,
    },
  });
}

function unsubUrl(userId: string, kind: "weekly" | "quote"): string | null {
  const secret = optOutSecret();
  if (!secret) return null;
  const token = signOptOut(userId, kind, secret);
  return `${appUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Тот же планировщик, что и день оплаты. Вне production писем нет. */
export async function runScheduledContentMail(now = new Date()) {
  if (process.env.NODE_ENV !== "production") return { skipped: "not-production" as const, weekly: 0, quote: 0, skippedPeople: 0 };
  const [weeklyGate, quoteGate] = await Promise.all([readBroadcast("weekly-task"), readBroadcast("daily-quote")]);
  const weeklySetting = weeklyGate.legacy ? defaultBroadcast("weekly-task") : weeklyGate.setting;
  const quoteSetting = quoteGate.legacy ? defaultBroadcast("daily-quote") : quoteGate.setting;
  if (!weeklySetting.enabled && !quoteSetting.enabled) return { skipped: "disabled" as const, weekly: 0, quote: 0, skippedPeople: 0 };

  let students: ContentStudent[] = [];
  try {
    students = await listStudents();
  } catch (error) {
    if (missingColumn(error)) return { skipped: "no-columns" as const, weekly: 0, quote: 0, skippedPeople: 0 };
    throw error;
  }

  let weekly: { publishedOn: string; letter: (student: ContentStudent) => { subject: string; html: string; text: string } } | null = null;
  if (weeklySetting.enabled) {
    const tasks = await prisma.weeklyTask.findMany({
      select: { id: true, title: true, prompt: true, lengthHint: true, publishedOn: true },
    });
    const picked = pickWeekly(tasks, moscowToday(now));
    if (picked.current) {
      const current = picked.current;
      const stored = await readLetterTemplate("weekly-task");
      weekly = {
        publishedOn: current.publishedOn,
        letter: (student) => {
          const url = unsubUrl(student.id, "weekly");
          const rendered = weeklyTaskLetter({
            name: student.name,
            title: current.title,
            prompt: current.prompt,
            lengthHint: current.lengthHint,
            publishedOn: current.publishedOn,
            nextPublishedOn: picked.upcoming?.publishedOn ?? null,
            unsubscribeUrl: url ?? undefined,
          });
          return applyLetterTemplate("weekly-task", stored, { subject: "Задание недели", ...rendered }, withAddress(student.name, {
            задание: current.title,
            текст: current.prompt,
            срок: weeklyWhen(current.publishedOn, picked.upcoming?.publishedOn ?? null),
            объём: weeklyVolume(current.lengthHint),
            отписка: url ?? "",
          }));
        },
      };
    }
  }

  let quote: { letter: (student: ContentStudent) => { subject: string; html: string; text: string } } | null = null;
  if (quoteSetting.enabled) {
    const row = await loadDailyQuote(now);
    if (row) {
      const stored = await readLetterTemplate("daily-quote");
      quote = {
        letter: (student) => {
          const url = unsubUrl(student.id, "quote");
          const rendered = dailyQuoteLetter({
            name: student.name,
            text: row.text,
            author: row.author,
            source: row.source,
            unsubscribeUrl: url ?? undefined,
          });
          return applyLetterTemplate("daily-quote", stored, { subject: "Цитата дня", ...rendered }, withAddress(student.name, {
            цитата: row.text,
            автор: row.author,
            источник: row.source ?? "",
            отписка: url ?? "",
          }));
        },
      };
    }
  }

  const weeklyEnvelope = await envelopeFor(weeklySetting.sender);
  const quoteEnvelope = await envelopeFor(quoteSetting.sender);
  const result = await deliverContentMail({
    now,
    weeklySetting,
    quoteSetting,
    students,
    weekly,
    quote,
    alreadySent: async (studentId, kind, period) => {
      const row = await prisma.emailLog.findFirst({
        where: {
          type: kind,
          recipientUserId: studentId,
          status: "sent",
          html: { contains: sentMarker(kind, period) },
        },
        select: { id: true },
      });
      return Boolean(row);
    },
    send: (input) => {
      const envelope = input.type === "weekly-task" ? weeklyEnvelope : quoteEnvelope;
      return sendMail({
        ...input,
        from: envelope.from,
        replyTo: envelope.replyTo,
      });
    },
    unsubscribeUrl: unsubUrl,
  });
  return { skipped: null, weekly: result.weekly, quote: result.quote, skippedPeople: result.skipped };
}
