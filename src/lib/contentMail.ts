import type { BroadcastSetting } from "@/lib/mailBroadcasts";
import { clockOpen, parseStudentIds, zonedClock } from "@/lib/mailBroadcasts";
import { calendarDay } from "@/lib/mailBroadcasts";

export type ContentKind = "weekly-task" | "daily-quote";

export type ContentStudent = {
  id: string;
  name: string;
  email: string;
  status: string;
  emailNotifications: boolean;
  weeklyEmails: boolean;
  quoteEmails: boolean;
};

export function sentMarker(kind: ContentKind, period: string): string {
  return `data-mail-period="${kind}:${period}"`;
}

export function wasSent(html: string, kind: ContentKind, period: string): boolean {
  return html.includes(sentMarker(kind, period));
}

/** Цитата: сутки по Москве. Задание: дата публикации текущего задания. */
export function contentPeriod(kind: ContentKind, now: Date, publishedOn: string | null): string | null {
  if (kind === "daily-quote") return calendarDay(now, "Europe/Moscow");
  return publishedOn && publishedOn.trim() ? publishedOn : null;
}

export function contentDue(setting: BroadcastSetting, now: Date): boolean {
  if (!setting.enabled) return false;
  return clockOpen(zonedClock(now, setting.timeZone), setting);
}

export function contentEligible(student: ContentStudent, kind: ContentKind, setting: BroadcastSetting): boolean {
  if (student.status !== "APPROVED") return false;
  if (!student.emailNotifications) return false;
  if (!student.email.includes("@")) return false;
  if (kind === "weekly-task" && !student.weeklyEmails) return false;
  if (kind === "daily-quote" && !student.quoteEmails) return false;
  if (setting.audience === "chosen" && !parseStudentIds(setting.studentIds).includes(student.id)) return false;
  return true;
}

export type ContentLetter = { subject: string; html: string; text: string };

export async function deliverContentMail(options: {
  now: Date;
  weeklySetting: BroadcastSetting;
  quoteSetting: BroadcastSetting;
  students: ContentStudent[];
  weekly: { publishedOn: string; letter: (student: ContentStudent) => ContentLetter } | null;
  quote: { letter: (student: ContentStudent) => ContentLetter } | null;
  alreadySent: (studentId: string, kind: ContentKind, period: string) => Promise<boolean>;
  send: (input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: ContentKind;
    recipientUserId: string;
    listUnsubscribe?: string;
  }) => Promise<boolean>;
  unsubscribeUrl: (studentId: string, kind: "weekly" | "quote") => string | null;
}): Promise<{ weekly: number; quote: number; skipped: number }> {
  let weeklySent = 0;
  let quoteSent = 0;
  let skipped = 0;

  const jobs: { kind: ContentKind; period: string; letter: (student: ContentStudent) => ContentLetter; setting: BroadcastSetting; opt: "weekly" | "quote" }[] = [];
  if (options.weekly && contentDue(options.weeklySetting, options.now)) {
    const period = contentPeriod("weekly-task", options.now, options.weekly.publishedOn);
    if (period) jobs.push({ kind: "weekly-task", period, letter: options.weekly.letter, setting: options.weeklySetting, opt: "weekly" });
  }
  if (options.quote && contentDue(options.quoteSetting, options.now)) {
    const period = contentPeriod("daily-quote", options.now, null);
    if (period) jobs.push({ kind: "daily-quote", period, letter: options.quote.letter, setting: options.quoteSetting, opt: "quote" });
  }

  for (const job of jobs) {
    for (const student of options.students) {
      if (!contentEligible(student, job.kind, job.setting)) {
        skipped += 1;
        continue;
      }
      if (await options.alreadySent(student.id, job.kind, job.period)) {
        skipped += 1;
        continue;
      }
      const letter = job.letter(student);
      const html = `${letter.html}\n<!-- ${sentMarker(job.kind, job.period)} -->`;
      const url = options.unsubscribeUrl(student.id, job.opt);
      const ok = await options.send({
        to: student.email,
        subject: letter.subject,
        html,
        text: url ? `${letter.text}\n${url}` : letter.text,
        type: job.kind,
        recipientUserId: student.id,
        listUnsubscribe: url ?? undefined,
      });
      if (!ok) {
        skipped += 1;
        continue;
      }
      if (job.kind === "weekly-task") weeklySent += 1;
      else quoteSent += 1;
    }
  }
  return { weekly: weeklySent, quote: quoteSent, skipped };
}
