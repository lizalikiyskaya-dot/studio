import { appUrl, escapeHtml, renderEmail } from "@/lib/mail";

/** Утро по Москве, когда письмо ещё уместно. Час 9 включительно, 12 уже нет. */
export const MORNING_FROM_HOUR = 9;
export const MORNING_UNTIL_HOUR = 12;

export type MoscowParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
};

export type ReminderPerson = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  paymentDay: number | null;
  paymentAmount: number | null;
  paymentReminders: boolean;
  emailNotifications: boolean;
};

export type PlannedReminder = {
  id: string;
  email: string;
  name: string;
  dueOn: string;
  subject: string;
  html: string;
};

export type ReminderRunResult = {
  skipped?: "not-morning" | "disabled";
  dueOn: string | null;
  planned: number;
  sent: number;
  alreadySent: number;
  failed: number;
  dryRun: boolean;
};

const FORBIDDEN = ["ученик", "ученица", "ученику", "ученицей", "оплатил", "оплатила", "должен", "должна"];

export function moscowParts(now: Date): MoscowParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) bag[part.type] = part.value;
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
  };
}

export function isMorning(parts: MoscowParts): boolean {
  return parts.hour >= MORNING_FROM_HOUR && parts.hour < MORNING_UNTIL_HOUR;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 31-е в апреле становится 30-м, в феврале — последним днём месяца. */
export function effectivePaymentDay(paymentDay: number, year: number, month: number): number {
  const last = daysInMonth(year, month);
  return Math.min(Math.max(1, paymentDay), last);
}

export function dueOnDate(parts: MoscowParts): string {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function isDue(person: ReminderPerson, parts: MoscowParts): boolean {
  if (person.role !== "STUDENT") return false;
  if (person.status !== "APPROVED") return false;
  if (!person.paymentReminders) return false;
  if (!person.emailNotifications) return false;
  if (!person.email.trim()) return false;
  if (person.paymentDay == null) return false;
  return parts.day === effectivePaymentDay(person.paymentDay, parts.year, parts.month);
}

function rubles(amount: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
}

function dateLabel(parts: MoscowParts): string {
  const stamp = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(stamp);
}

export function buildPaymentReminder(person: { name: string; paymentAmount: number | null }, parts: MoscowParts): {
  subject: string;
  html: string;
} {
  const when = dateLabel(parts);
  const paragraphs = [`${escapeHtml(person.name)}, сегодня ${when} — день оплаты.`];
  if (person.paymentAmount != null) paragraphs.push(`Сумма — ${rubles(person.paymentAmount)}.`);
  paragraphs.push("Если дата или сумма изменились, напишите мне в Телеграме.");
  const subject = "Сегодня день оплаты";
  const html = renderEmail({
    title: subject,
    paragraphs,
    action: { label: "Открыть платформу", url: `${appUrl()}/login` },
    footnote: "Письмо приходит утром в день оплаты. Отключить его может наставник.",
  });
  return { subject, html };
}

export function reminderCopyHasGenderedForms(text: string): string[] {
  const hay = text.toLowerCase();
  return FORBIDDEN.filter((word) => hay.includes(word));
}

export async function runPaymentReminders(options: {
  now?: Date;
  dryRun?: boolean;
  force?: boolean;
  list: () => Promise<ReminderPerson[]>;
  claim: (studentId: string, dueOn: string) => Promise<boolean>;
  release: (studentId: string, dueOn: string) => Promise<void>;
  send: (input: { to: string; subject: string; html: string }) => Promise<boolean>;
}): Promise<ReminderRunResult> {
  const now = options.now ?? new Date();
  const parts = moscowParts(now);
  const dryRun = options.dryRun === true;
  if (!options.force && !isMorning(parts)) {
    return { skipped: "not-morning", dueOn: dueOnDate(parts), planned: 0, sent: 0, alreadySent: 0, failed: 0, dryRun };
  }
  const dueOn = dueOnDate(parts);
  const people = (await options.list()).filter((person) => isDue(person, parts));
  let sent = 0;
  let alreadySent = 0;
  let failed = 0;
  for (const person of people) {
    const letter = buildPaymentReminder(person, parts);
    if (dryRun) {
      sent += 1;
      continue;
    }
    const claimed = await options.claim(person.id, dueOn);
    if (!claimed) {
      alreadySent += 1;
      continue;
    }
    const ok = await options.send({ to: person.email, subject: letter.subject, html: letter.html });
    if (!ok) {
      failed += 1;
      await options.release(person.id, dueOn);
      continue;
    }
    sent += 1;
  }
  return { dueOn, planned: people.length, sent, alreadySent, failed, dryRun };
}
