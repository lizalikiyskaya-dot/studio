import type { BroadcastSetting } from "@/lib/mailBroadcasts";
import { calendarDay, clockOpen, parseStudentIds, zonedClock } from "@/lib/mailBroadcasts";
import { addressForm, FORMAL_ADDRESS_NAMES, usesFormalAddress, withGreeting } from "@/lib/addressForm";
import { EMAIL_SIGNATURE, escapeHtml, renderEmail } from "@/lib/mail";
import { optOutLinkLabel } from "@/lib/mailOptOut";

export const DEADLINE_ZONE = "Europe/Moscow";

export { FORMAL_ADDRESS_NAMES, usesFormalAddress };

const DONE_STATUSES = new Set(["SUBMITTED", "ACCEPTED"]);

export type DeadlineTask = {
  id: string;
  title: string;
  status: string;
  deadline: Date | null;
  studentId: string;
};

export type DeadlineStudent = {
  id: string;
  name: string;
  email: string;
  status: string;
  emailNotifications: boolean;
};

export type DeadlineLetter = { subject: string; html: string; text: string };

export type DeadlineDelivery = {
  name: string;
  email: string;
  subject: string;
  titles: string[];
};

export type DeadlineRunResult = {
  dueOn: string | null;
  planned: number;
  sent: number;
  alreadySent: number;
  failed: number;
  dryRun: boolean;
  skipped: "disabled" | "not-morning" | null;
  deliveries: DeadlineDelivery[];
};

export function deadlineDryRun(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.DEADLINE_REMINDER_DRY_RUN;
  return flag === "1" || flag === "true" || env.NODE_ENV !== "production";
}

export function deadlineReminderLogLine(result: Pick<DeadlineRunResult, "dueOn" | "planned" | "sent" | "alreadySent" | "failed" | "dryRun">): string {
  return `[deadline-reminder] завтра ${result.dueOn}: к отправке ${result.planned}, ушло ${result.sent}, уже было ${result.alreadySent}, ошибок ${result.failed}, dry-run ${result.dryRun}`;
}

export function statusNeedsReminder(status: string): boolean {
  return !DONE_STATUSES.has(status);
}

/** Завтрашняя календарная дата по Москве, YYYY-MM-DD. */
export function tomorrowMoscow(now: Date): string {
  const [year, month, day] = calendarDay(now, DEADLINE_ZONE).split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${next.getUTCFullYear()}-${mm}-${dd}`;
}

export function isDueTomorrow(deadline: Date, now: Date): boolean {
  return calendarDay(deadline, DEADLINE_ZONE) === tomorrowMoscow(now);
}

export function deadlineMarker(taskId: string, dueOn: string): string {
  return `data-deadline-task="${taskId}:${dueOn}"`;
}

export function taskUrl(baseUrl: string, taskId: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/dashboard/tasks#task-${taskId}`;
}

export function formatDeadline(deadline: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: DEADLINE_ZONE,
  }).format(deadline);
}

function quotedTitle(title: string): string {
  return `«${escapeHtml(title.trim() || "Задание")}»`;
}

function deadlineFoot(url: string | undefined): string {
  const base = "Письмо приходит в 9:00 по Москве, если срок завтра. Отключить его может наставник.";
  if (!url) return base;
  return `${base}<br><a href="${escapeHtml(url)}" style="color:#4B3FC0;text-decoration:underline;">${escapeHtml(optOutLinkLabel("mail"))}</a>`;
}

export function buildDeadlineLetter(input: {
  name: string;
  tasks: { id: string; title: string; deadline: Date }[];
  baseUrl: string;
  unsubscribeUrl?: string;
}): DeadlineLetter {
  const many = input.tasks.length > 1;
  const when = formatDeadline(input.tasks[0].deadline);
  const subject = many ? "Завтра сроки по заданиям" : "Завтра срок по заданию";
  const opening = many
    ? escapeHtml(withGreeting(input.name, `напоминаю: завтра, ${when}, срок по заданиям:`))
    : escapeHtml(withGreeting(input.name, `напоминаю: завтра, ${when}, срок по заданию «${input.tasks[0].title.trim() || "Задание"}».`));
  const titles = many ? input.tasks.map((task) => quotedTitle(task.title)) : [];
  const closing = "Если работа уже сдана, это письмо можно не читать.";
  const ask = `Если нужно больше времени на ${many ? "задания" : "задание"}, пожалуйста, ${addressForm(input.name).write} мне!`;
  const home = input.baseUrl.replace(/\/+$/, "");
  const letter = renderEmail({
    title: subject,
    paragraphs: [opening, ...titles, closing, ask],
    action: many
      ? { label: "Открыть задания", url: `${home}/dashboard/tasks` }
      : { label: "Открыть задание", url: taskUrl(home, input.tasks[0].id) },
    footnote: deadlineFoot(input.unsubscribeUrl),
    signature: EMAIL_SIGNATURE,
    siteUrl: home,
    formal: usesFormalAddress(input.name),
  });
  return { subject, html: letter.html, text: letter.text };
}

/** Превью: APP_URL, если он задан. Иначе адрес студии, не запасной из appUrl(). */
export function deadlinePreviewBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.APP_URL?.trim();
  return (configured || "https://studio.lizandwriter.ru").replace(/\/+$/, "");
}

export function deadlinePreviewLetters(baseUrl = deadlinePreviewBaseUrl()): {
  formal: DeadlineLetter;
  informal: DeadlineLetter;
  several: DeadlineLetter;
} {
  const deadline = new Date("2026-10-26T00:00:00Z");
  return {
    formal: buildDeadlineLetter({
      name: "Виктория",
      baseUrl,
      tasks: [{ id: "scene", title: "Сцена в кухне", deadline }],
    }),
    informal: buildDeadlineLetter({
      name: "Саша",
      baseUrl,
      tasks: [{ id: "night", title: "Ночной разговор", deadline }],
    }),
    several: buildDeadlineLetter({
      name: "Виктория",
      baseUrl,
      tasks: [
        { id: "scene", title: "Сцена в кухне", deadline },
        { id: "night", title: "Ночной разговор", deadline },
      ],
    }),
  };
}

export function deadlineSkipReason(student: DeadlineStudent, setting: BroadcastSetting): string | null {
  if (student.status !== "APPROVED") return "Ученик ещё не одобрен.";
  if (!student.emailNotifications) return "У ученика выключена почта.";
  if (!student.email.includes("@")) return "У ученика нет почты.";
  if (setting.audience === "chosen" && !parseStudentIds(setting.studentIds).includes(student.id)) return "Ученик не в списке этой рассылки.";
  return null;
}

function eligibleStudent(student: DeadlineStudent, setting: BroadcastSetting): boolean {
  return deadlineSkipReason(student, setting) == null;
}

/** Имя целиком, первое слово имени или почта. Несколько совпадений не выбирают никого. */
export function matchDeadlineStudent(
  students: DeadlineStudent[],
  query: string,
): { student: DeadlineStudent } | { error: string } {
  const needle = query.trim();
  if (!needle) return { error: "Укажите имя или почту ученика." };
  const folded = needle.toLocaleLowerCase("ru-RU");
  const same = (value: string) => value.trim().toLocaleLowerCase("ru-RU") === folded;
  const found = needle.includes("@")
    ? students.filter((student) => same(student.email))
    : students.filter((student) => same(student.name));
  const picked = found.length > 0 || needle.includes("@")
    ? found
    : students.filter((student) => same(student.name.trim().split(/\s+/)[0] ?? ""));
  if (picked.length === 1) return { student: picked[0] };
  if (picked.length === 0) return { error: `Ученик не найден: ${needle}` };
  const list = picked.map((student) => `${student.name} <${student.email}>`).join("; ");
  return { error: `Подходит несколько учеников: ${list}` };
}

function emptyResult(partial: Partial<DeadlineRunResult> & Pick<DeadlineRunResult, "dryRun" | "skipped">): DeadlineRunResult {
  return {
    dueOn: null,
    planned: 0,
    sent: 0,
    alreadySent: 0,
    failed: 0,
    deliveries: [],
    ...partial,
  };
}

export async function deliverDeadlineReminders(options: {
  now: Date;
  setting: BroadcastSetting;
  students: DeadlineStudent[];
  tasks: DeadlineTask[];
  dryRun?: boolean;
  /** Ручной прогон: не смотреть, включена ли рассылка и наступило ли 9:00. */
  force?: boolean;
  baseUrl: string;
  alreadySent: (studentId: string, taskId: string, dueOn: string) => Promise<boolean>;
  send: (input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: "deadline";
    recipientUserId: string;
    listUnsubscribe?: string;
  }) => Promise<boolean>;
  unsubscribeUrl?: (studentId: string) => string | null;
}): Promise<DeadlineRunResult> {
  const dryRun = options.dryRun === true;
  if (!options.force && !options.setting.enabled) return emptyResult({ dryRun, skipped: "disabled" });
  if (!options.force && !clockOpen(zonedClock(options.now, options.setting.timeZone), options.setting)) {
    return emptyResult({ dryRun, skipped: "not-morning" });
  }

  const dueOn = tomorrowMoscow(options.now);
  const people = new Map(options.students.map((student) => [student.id, student]));
  const byStudent = new Map<string, DeadlineTask[]>();
  for (const task of options.tasks) {
    if (!task.deadline || !statusNeedsReminder(task.status) || !isDueTomorrow(task.deadline, options.now)) continue;
    const student = people.get(task.studentId);
    if (!student || !eligibleStudent(student, options.setting)) continue;
    const list = byStudent.get(student.id) ?? [];
    list.push(task);
    byStudent.set(student.id, list);
  }

  let planned = 0;
  let sent = 0;
  let alreadySent = 0;
  let failed = 0;
  const deliveries: DeadlineDelivery[] = [];

  for (const [studentId, tasks] of byStudent) {
    const student = people.get(studentId);
    if (!student) continue;
    const pending: DeadlineTask[] = [];
    for (const task of tasks) {
      const day = calendarDay(task.deadline as Date, DEADLINE_ZONE);
      if (await options.alreadySent(student.id, task.id, day)) {
        alreadySent += 1;
        continue;
      }
      pending.push(task);
    }
    if (pending.length === 0) continue;
    planned += 1;
    const ready = pending.map((task) => ({ id: task.id, title: task.title, deadline: task.deadline as Date }));
    const unsubscribeUrl = options.unsubscribeUrl?.(student.id) ?? undefined;
    const letter = buildDeadlineLetter({
      name: student.name,
      baseUrl: options.baseUrl,
      tasks: ready,
      unsubscribeUrl,
    });
    deliveries.push({
      name: student.name,
      email: student.email,
      subject: letter.subject,
      titles: ready.map((task) => task.title.trim() || "Задание"),
    });
    if (dryRun) {
      sent += 1;
      continue;
    }
    const markers = pending
      .map((task) => `<!-- ${deadlineMarker(task.id, calendarDay(task.deadline as Date, DEADLINE_ZONE))} -->`)
      .join("\n");
    const ok = await options.send({
      to: student.email,
      subject: letter.subject,
      html: `${letter.html}\n${markers}`,
      text: letter.text,
      type: "deadline",
      recipientUserId: student.id,
      listUnsubscribe: unsubscribeUrl,
    });
    if (ok) sent += 1;
    else failed += 1;
  }

  return { dueOn, planned, sent, alreadySent, failed, dryRun, skipped: null, deliveries };
}
