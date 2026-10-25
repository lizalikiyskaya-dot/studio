import type { BroadcastSetting } from "@/lib/mailBroadcasts";
import { calendarDay, clockOpen, parseStudentIds, zonedClock } from "@/lib/mailBroadcasts";
import { EMAIL_SIGNATURE, escapeHtml, renderEmail } from "@/lib/mail";

export const DEADLINE_ZONE = "Europe/Moscow";

/**
 * К кому студия обращается на «Вы».
 * Отдельного поля в карточке ученика нет: правило сидит в этом списке.
 * Сравнение по первому слову имени, без учёта регистра.
 * Виктория: «Вы». Остальные: «ты».
 */
export const FORMAL_ADDRESS_NAMES = ["Виктория"] as const;

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

export type DeadlineRunResult = {
  dueOn: string | null;
  planned: number;
  sent: number;
  alreadySent: number;
  failed: number;
  dryRun: boolean;
  skipped: "disabled" | "not-morning" | null;
};

export function deadlineDryRun(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.DEADLINE_REMINDER_DRY_RUN;
  return flag === "1" || flag === "true" || env.NODE_ENV !== "production";
}

export function deadlineReminderLogLine(result: Pick<DeadlineRunResult, "dueOn" | "planned" | "sent" | "alreadySent" | "failed" | "dryRun">): string {
  return `[deadline-reminder] завтра ${result.dueOn}: к отправке ${result.planned}, ушло ${result.sent}, уже было ${result.alreadySent}, ошибок ${result.failed}, dry-run ${result.dryRun}`;
}

export function usesFormalAddress(name: string): boolean {
  const first = name.trim().split(/\s+/)[0]?.toLocaleLowerCase("ru-RU") ?? "";
  if (!first) return false;
  return FORMAL_ADDRESS_NAMES.some((item) => item.toLocaleLowerCase("ru-RU") === first);
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

export function buildDeadlineLetter(input: {
  name: string;
  tasks: { id: string; title: string; deadline: Date }[];
  baseUrl: string;
}): DeadlineLetter {
  const formal = usesFormalAddress(input.name);
  const many = input.tasks.length > 1;
  const when = escapeHtml(formatDeadline(input.tasks[0].deadline));
  const name = escapeHtml(input.name);
  const subject = many ? "Завтра сроки по заданиям" : "Завтра срок по заданию";
  const opening = many
    ? `${name}, напоминаю: завтра, ${when}, срок по заданиям:`
    : `${name}, напоминаю: завтра, ${when}, срок по заданию ${quotedTitle(input.tasks[0].title)}.`;
  const titles = many ? input.tasks.map((task) => quotedTitle(task.title)) : [];
  const closing = formal
    ? "Если Вы уже сдали работу, это письмо можно не читать."
    : "Если ты уже сдал работу, это письмо можно не читать.";
  const home = input.baseUrl.replace(/\/+$/, "");
  const letter = renderEmail({
    title: subject,
    paragraphs: [opening, ...titles, closing],
    action: many
      ? { label: "Открыть задания", url: `${home}/dashboard/tasks` }
      : { label: "Открыть задание", url: taskUrl(home, input.tasks[0].id) },
    footnote: "Письмо приходит в 9:00 по Москве, если срок завтра. Отключить его может наставник.",
    signature: EMAIL_SIGNATURE,
    siteUrl: home,
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

function eligibleStudent(student: DeadlineStudent, setting: BroadcastSetting): boolean {
  if (student.status !== "APPROVED") return false;
  if (!student.emailNotifications) return false;
  if (!student.email.includes("@")) return false;
  if (setting.audience === "chosen" && !parseStudentIds(setting.studentIds).includes(student.id)) return false;
  return true;
}

function emptyResult(partial: Partial<DeadlineRunResult> & Pick<DeadlineRunResult, "dryRun" | "skipped">): DeadlineRunResult {
  return {
    dueOn: null,
    planned: 0,
    sent: 0,
    alreadySent: 0,
    failed: 0,
    ...partial,
  };
}

export async function deliverDeadlineReminders(options: {
  now: Date;
  setting: BroadcastSetting;
  students: DeadlineStudent[];
  tasks: DeadlineTask[];
  dryRun?: boolean;
  baseUrl: string;
  alreadySent: (studentId: string, taskId: string, dueOn: string) => Promise<boolean>;
  send: (input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: "deadline";
    recipientUserId: string;
  }) => Promise<boolean>;
}): Promise<DeadlineRunResult> {
  const dryRun = options.dryRun === true;
  if (!options.setting.enabled) return emptyResult({ dryRun, skipped: "disabled" });
  if (!clockOpen(zonedClock(options.now, options.setting.timeZone), options.setting)) {
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
    if (dryRun) {
      sent += 1;
      continue;
    }
    const letter = buildDeadlineLetter({
      name: student.name,
      baseUrl: options.baseUrl,
      tasks: pending.map((task) => ({ id: task.id, title: task.title, deadline: task.deadline as Date })),
    });
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
    });
    if (ok) sent += 1;
    else failed += 1;
  }

  return { dueOn, planned, sent, alreadySent, failed, dryRun, skipped: null };
}
