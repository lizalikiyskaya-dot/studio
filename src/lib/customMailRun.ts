import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mail";
import { optOutSecret, signOptOut } from "@/lib/mailOptOut";
import { envelopeFor } from "@/lib/mailBroadcastStore";
import {
  CUSTOM_MAIL_TYPE,
  customEligible,
  customMailLetter,
  customSentMarker,
  customSlot,
  type CustomMailingPlan,
} from "@/lib/customMail";
import type { CustomMailingRow } from "@/lib/customMailPlan";
import { readCustomMailings } from "@/lib/customMailStore";

type Person = { id: string; name: string; email: string; status: string; emailNotifications: boolean };

function mailUnsubscribe(studentId: string): string | null {
  const secret = optOutSecret();
  if (!secret) return null;
  return `${appUrl()}/unsubscribe?token=${signOptOut(studentId, "mail", secret)}`;
}

export async function deliverCustomMail(options: {
  now: Date;
  rows: CustomMailingRow[];
  students: Person[];
  alreadySent: (mailingId: string, studentId: string, slot: string) => Promise<boolean>;
  send: (input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: string;
    recipientUserId: string;
    listUnsubscribe?: string;
  }) => Promise<boolean>;
  unsubscribeUrl?: (studentId: string) => string | null;
}): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;
  for (const row of options.rows) {
    const slot = customSlot(row, options.now);
    if (!slot) continue;
    for (const student of options.students) {
      if (!customEligible(student, row)) {
        skipped += 1;
        continue;
      }
      if (await options.alreadySent(row.id, student.id, slot)) {
        skipped += 1;
        continue;
      }
      const url = options.unsubscribeUrl?.(student.id) ?? null;
      const letter = customMailLetter({
        name: student.name,
        subject: row.subject,
        body: row.body,
        unsubscribeUrl: url ?? undefined,
      });
      const html = `${letter.html}\n<!-- ${customSentMarker(row.id, slot)} -->`;
      const text = url && !letter.text.includes(url) ? `${letter.text}\n${url}` : letter.text;
      const ok = await options.send({
        to: student.email,
        subject: letter.subject,
        html,
        text,
        type: CUSTOM_MAIL_TYPE,
        recipientUserId: student.id,
        listUnsubscribe: url ?? undefined,
      });
      if (ok) sent += 1;
      else skipped += 1;
    }
  }
  return { sent, skipped };
}

/** Тот же планировщик, что и остальные автоматические письма. Вне production писем нет. */
export async function runScheduledCustomMail(now = new Date()) {
  if (process.env.NODE_ENV !== "production") return { skipped: "not-production" as const, sent: 0 };
  const stored = await readCustomMailings();
  if (!stored.ready) return { skipped: "no-table" as const, sent: 0 };
  const due = stored.rows.filter((row) => customSlot(row, now));
  if (due.length === 0) return { skipped: null, sent: 0 };
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", status: "APPROVED" },
    select: { id: true, name: true, email: true, status: true, emailNotifications: true },
  });
  const envelope = await envelopeFor("profile");
  const result = await deliverCustomMail({
    now,
    rows: due,
    students,
    alreadySent: async (mailingId, studentId, slot) => {
      const hit = await prisma.emailLog.findFirst({
        where: {
          type: CUSTOM_MAIL_TYPE,
          recipientUserId: studentId,
          status: "sent",
          html: { contains: customSentMarker(mailingId, slot) },
        },
        select: { id: true },
      });
      return Boolean(hit);
    },
    send: (input) => sendMail({ ...input, from: envelope.from, replyTo: envelope.replyTo }),
    unsubscribeUrl: mailUnsubscribe,
  });
  return { skipped: null, sent: result.sent };
}

export type { CustomMailingPlan };
