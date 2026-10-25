import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mail";
import { defaultBroadcast } from "@/lib/mailBroadcasts";
import { envelopeFor, readBroadcast } from "@/lib/mailBroadcastStore";
import {
  deadlineDryRun,
  deadlineMarker,
  deliverDeadlineReminders,
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

const idle = (dryRun: boolean, skipped: DeadlineRunResult["skipped"]): DeadlineRunResult => ({
  dueOn: null,
  planned: 0,
  sent: 0,
  alreadySent: 0,
  failed: 0,
  dryRun,
  skipped,
});

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
      baseUrl: appUrl(),
      alreadySent: async (studentId, taskId, dueOn) => {
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
      send: (input) =>
        sendMail({
          ...input,
          from: envelope.from,
          replyTo: envelope.replyTo,
        }),
    });
  });
}
