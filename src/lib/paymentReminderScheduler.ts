import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { runPaymentReminders, type ReminderPerson } from "@/lib/paymentReminders";
import { clockOpen, parseStudentIds, zonedClock } from "@/lib/mailBroadcasts";
import { envelopeFor, readBroadcast } from "@/lib/mailBroadcastStore";
import { runScheduledContentMail } from "@/lib/contentMailRun";

const LOCK_KEY = 8710231842018;
const TICK_MS = 15 * 60 * 1000;
const FIRST_TICK_MS = 20_000;

const globalState = globalThis as unknown as { paymentRemindersStarted?: boolean };

function dryRunEnabled(): boolean {
  const flag = process.env.PAYMENT_REMINDER_DRY_RUN;
  return flag === "1" || flag === "true";
}

function dueDate(dueOn: string): Date {
  const [year, month, day] = dueOn.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
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

async function listPeople(): Promise<ReminderPerson[]> {
  const rows = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      status: "APPROVED",
      paymentDay: { not: null },
      paymentReminders: true,
      emailNotifications: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      paymentDay: true,
      paymentAmount: true,
      paymentReminders: true,
      emailNotifications: true,
    },
  });
  return rows;
}

/** Один прогон. Письма уходят только в продакшене и только без dry-run. */
export async function runScheduledPaymentReminders(now = new Date()) {
  const gate = await readBroadcast("payment");
  const setting = gate.legacy ? null : gate.setting;
  if (setting && !setting.enabled) {
    return { skipped: "disabled" as const, dueOn: null, planned: 0, sent: 0, alreadySent: 0, failed: 0, dryRun: true };
  }
  if (setting && !clockOpen(zonedClock(now, setting.timeZone), setting)) {
    return { skipped: "not-morning" as const, dueOn: null, planned: 0, sent: 0, alreadySent: 0, failed: 0, dryRun: false };
  }
  const dryRun = dryRunEnabled() || process.env.NODE_ENV !== "production";
  const chosen = setting?.audience === "chosen" ? new Set(parseStudentIds(setting.studentIds)) : null;
  const envelope = setting ? await envelopeFor(setting.sender) : null;
  const clock = setting ? zonedClock(now, setting.timeZone) : null;
  return withLock(() =>
    runPaymentReminders({
      now,
      parts: clock ? { year: clock.year, month: clock.month, day: clock.day, hour: clock.hour } : undefined,
      dryRun,
      force: Boolean(setting),
      list: async () => {
        const people = await listPeople();
        return chosen ? people.filter((person) => chosen.has(person.id)) : people;
      },
      claim: async (studentId, dueOn) => {
        try {
          await prisma.paymentReminderLog.create({
            data: { studentId, dueOn: dueDate(dueOn) },
          });
          return true;
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (code === "P2002") return false;
          throw error;
        }
      },
      release: async (studentId, dueOn) => {
        await prisma.paymentReminderLog.deleteMany({
          where: { studentId, dueOn: dueDate(dueOn) },
        });
      },
      send: async ({ to, subject, html, text, recipientUserId }) =>
        sendMail({
          to,
          subject,
          html,
          text,
          type: "payment",
          recipientUserId,
          from: envelope?.from,
          replyTo: envelope?.replyTo,
        }),
    })
  );
}

export function startPaymentReminderScheduler() {
  if (globalState.paymentRemindersStarted) return;
  globalState.paymentRemindersStarted = true;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.npm_lifecycle_event === "build") return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.PAYMENT_REMINDERS === "0") return;

  const tick = () => {
    runScheduledPaymentReminders()
      .then((result) => {
        if (!result || result.planned === 0) return;
        console.log(
          `[payment-reminder] день ${result.dueOn}: к отправке ${result.planned}, ушло ${result.sent}, уже было ${result.alreadySent}, ошибок ${result.failed}, dry-run ${result.dryRun}`
        );
      })
      .catch((error) => {
        console.error("[payment-reminder] прогон не удался:", error);
      });
    runScheduledContentMail()
      .then((result) => {
        if (!result || result.skipped || (result.weekly === 0 && result.quote === 0)) return;
        console.log(`[content-mail] задание ${result.weekly}, цитата ${result.quote}`);
      })
      .catch((error) => {
        console.error("[content-mail] прогон не удался:", error);
      });
  };

  const first = setTimeout(tick, FIRST_TICK_MS);
  first.unref?.();
  const timer = setInterval(tick, TICK_MS);
  timer.unref?.();
}
