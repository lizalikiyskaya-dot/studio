import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mail";
import { defaultBroadcast } from "@/lib/mailBroadcasts";
import { envelopeFor, readBroadcast } from "@/lib/mailBroadcastStore";
import {
  deadlineDryRun,
  deadlineMarker,
  deadlineSkipReason,
  deliverDeadlineReminders,
  isDueTomorrow,
  matchDeadlineStudent,
  statusNeedsReminder,
  type DeadlineRunResult,
  type DeadlineStudent,
  type DeadlineTask,
} from "@/lib/deadlineReminders";

const LOCK_KEY = 8710231842019;

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

async function listStudents(): Promise<DeadlineStudent[]> {
  return prisma.user.findMany({
    where: { role: "STUDENT", status: "APPROVED" },
    select: { id: true, name: true, email: true, status: true, emailNotifications: true },
  });
}

async function listTasks(): Promise<DeadlineTask[]> {
  return prisma.task.findMany({
    where: { deadline: { not: null } },
    select: { id: true, title: true, status: true, deadline: true, studentId: true },
  });
}

function reminderDeps(envelope: { from: string; replyTo?: string }) {
  return {
    baseUrl: appUrl(),
    alreadySent: async (studentId: string, taskId: string, dueOn: string) => {
      const row = await prisma.emailLog.findFirst({
        where: {
          type: "deadline",
          recipientUserId: studentId,
          status: "sent",
          html: { contains: deadlineMarker(taskId, dueOn) },
        },
        select: { id: true },
      });
      return Boolean(row);
    },
    send: (input: {
      to: string;
      subject: string;
      html: string;
      text: string;
      type: "deadline";
      recipientUserId: string;
    }) =>
      sendMail({
        ...input,
        from: envelope.from,
        replyTo: envelope.replyTo,
      }),
  };
}

const idle = (dryRun: boolean, skipped: DeadlineRunResult["skipped"]): DeadlineRunResult => ({
  dueOn: null,
  planned: 0,
  sent: 0,
  alreadySent: 0,
  failed: 0,
  dryRun,
  skipped,
  deliveries: [],
});

export type OneDeadlineReminder = {
  code: number;
  lines: string[];
};

/** Ручная отправка одному ученику. Тот же журнал и те же метки, что у утреннего прогона. */
export async function runOneDeadlineReminder(query: string, dryRun: boolean, now = new Date()): Promise<OneDeadlineReminder> {
  const gate = await readBroadcast("deadline");
  const stored = gate.legacy ? defaultBroadcast("deadline") : gate.setting;
  const setting = { ...stored, enabled: true, hour: null, audience: "all" as const, studentIds: "" };
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true, status: true, emailNotifications: true },
  });
  const matched = matchDeadlineStudent(students, query);
  if ("error" in matched) return { code: 1, lines: [matched.error] };
  const reason = deadlineSkipReason(matched.student, setting);
  if (reason) return { code: 1, lines: [reason] };

  const tasks = await prisma.task.findMany({
    where: { studentId: matched.student.id, deadline: { not: null } },
    select: { id: true, title: true, status: true, deadline: true, studentId: true },
  });
  const due = tasks.filter((task) => task.deadline && statusNeedsReminder(task.status) && isDueTomorrow(task.deadline, now));
  if (due.length === 0) return { code: 1, lines: ["На завтра нет несданных заданий."] };

  const envelope = await envelopeFor(stored.sender);
  const result = await withLock(() =>
    deliverDeadlineReminders({
      now,
      setting,
      students: [matched.student],
      tasks,
      dryRun,
      force: true,
      ...reminderDeps(envelope),
    }),
  );
  if (!result) return { code: 1, lines: ["Сейчас уже идёт другой прогон напоминаний."] };
  return { code: oneOffExit(result), lines: oneOffLines(result, dryRun) };
}

function oneOffLines(result: DeadlineRunResult, dryRun: boolean): string[] {
  if (result.deliveries.length === 0 && result.alreadySent > 0) {
    return ["Это напоминание уже уходило. Повтор не отправлен."];
  }
  const lines: string[] = [];
  for (const delivery of result.deliveries) {
    lines.push(`Кому: ${delivery.name} <${delivery.email}>`);
    lines.push(`Тема: ${delivery.subject}`);
    lines.push(`Задания: ${delivery.titles.join("; ")}`);
  }
  if (dryRun) lines.push("dry-run: письмо не отправлено");
  else if (result.sent > 0) lines.push("Письмо отправлено.");
  else if (result.failed > 0) lines.push("Письмо не отправилось. Смотрите журнал почты.");
  return lines;
}

function oneOffExit(result: DeadlineRunResult): number {
  if (result.failed > 0) return 1;
  if (result.deliveries.length === 0 && result.alreadySent > 0) return 0;
  if (result.sent > 0) return 0;
  return 1;
}

/** Один прогон. Живые письма только в продакшене и без DEADLINE_REMINDER_DRY_RUN. */
export async function runScheduledDeadlineReminders(now = new Date()): Promise<DeadlineRunResult | null> {
  const gate = await readBroadcast("deadline");
  const setting = gate.legacy ? defaultBroadcast("deadline") : gate.setting;
  const dryRun = deadlineDryRun();
  if (!setting.enabled) return idle(true, "disabled");
  const envelope = await envelopeFor(setting.sender);
  return withLock(async () => {
    const [students, tasks] = await Promise.all([listStudents(), listTasks()]);
    return deliverDeadlineReminders({
      now,
      setting,
      students,
      tasks,
      dryRun,
      ...reminderDeps(envelope),
    });
  });
}
