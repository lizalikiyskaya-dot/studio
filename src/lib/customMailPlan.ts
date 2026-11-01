import { calendarDay, clockOpen, parseStudentIds, zonedClock } from "@/lib/mailBroadcasts";

export const CUSTOM_MAIL_ZONE = "Europe/Moscow";
export const CUSTOM_MAIL_WINDOW_MINUTES = 60;
export const CUSTOM_MAIL_TYPE = "custom-mail";

export type CustomCadence = "once" | "weekly" | "monthly";

export type CustomMailingInput = {
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  cadence: string;
  runOn: string;
  weekday: number;
  monthDay: number;
  hour: number;
  minute: number;
  audience: string;
  studentIds: string;
};

export type CustomMailingPlan = CustomMailingInput & {
  cadence: CustomCadence;
  audience: "all" | "chosen";
};

export type CustomMailingRow = CustomMailingPlan & { id: string };

const WEEKLY = ["", "по понедельникам", "по вторникам", "по средам", "по четвергам", "по пятницам", "по субботам", "по воскресеньям"];

export function parseCustomMailing(input: CustomMailingInput): { ok: true; value: CustomMailingPlan } | { ok: false; error: string } {
  const name = input.name.trim().slice(0, 80);
  const subject = input.subject.trim().slice(0, 180);
  const body = input.body.replace(/\r\n/g, "\n").trim().slice(0, 8000);
  if (!name) return { ok: false, error: "Напишите название." };
  if (!subject) return { ok: false, error: "Напишите тему." };
  if (!body) return { ok: false, error: "Напишите текст письма." };
  const cadence: CustomCadence = input.cadence === "weekly" || input.cadence === "monthly" ? input.cadence : "once";
  const runOn = input.runOn.trim();
  if (cadence === "once" && !/^\d{4}-\d{2}-\d{2}$/.test(runOn)) return { ok: false, error: "Выберите дату." };
  const weekday = input.weekday >= 1 && input.weekday <= 7 ? Math.trunc(input.weekday) : 1;
  const monthDay = Math.min(28, Math.max(1, Math.trunc(Number(input.monthDay)) || 1));
  const hour = Math.min(23, Math.max(0, Math.trunc(Number(input.hour)) || 0));
  const minute = Math.min(59, Math.max(0, Math.trunc(Number(input.minute)) || 0));
  const audience = input.audience === "chosen" ? "chosen" : "all";
  const studentIds = parseStudentIds(input.studentIds).join(",");
  if (audience === "chosen" && !studentIds) return { ok: false, error: "Выберите хотя бы одного ученика." };
  return {
    ok: true,
    value: {
      name,
      subject,
      body,
      enabled: input.enabled === true,
      cadence,
      runOn: cadence === "once" ? runOn : "",
      weekday,
      monthDay,
      hour,
      minute,
      audience,
      studentIds,
    },
  };
}

export function customScheduleLabel(plan: Pick<CustomMailingPlan, "cadence" | "runOn" | "weekday" | "monthDay" | "hour" | "minute">): string {
  const time = `${String(plan.hour).padStart(2, "0")}:${String(plan.minute).padStart(2, "0")}, Москва`;
  if (plan.cadence === "weekly") return `${WEEKLY[plan.weekday] ?? WEEKLY[1]}, ${time}`;
  if (plan.cadence === "monthly") return `каждый месяц, ${plan.monthDay}-е число, ${time}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(plan.runOn)) {
    const [year, month, day] = plan.runOn.split("-").map(Number);
    const label = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
    return `${label.replace(" г.", "")}, ${time}`;
  }
  return `дата не выбрана, ${time}`;
}

/** Слот этой отправки. null: сейчас письмо не должно уйти. */
export function customSlot(plan: CustomMailingPlan, now: Date): string | null {
  if (!plan.enabled) return null;
  const clock = zonedClock(now, CUSTOM_MAIL_ZONE);
  const open = clockOpen(clock, {
    hour: plan.hour,
    minute: plan.minute,
    windowMinutes: CUSTOM_MAIL_WINDOW_MINUTES,
    weekdays: "",
  });
  if (!open) return null;
  const day = calendarDay(now, CUSTOM_MAIL_ZONE);
  if (plan.cadence === "once") return plan.runOn === day ? plan.runOn : null;
  if (plan.cadence === "weekly") return clock.weekday === plan.weekday ? day : null;
  if (plan.cadence === "monthly") return clock.day === plan.monthDay ? day.slice(0, 7) : null;
  return null;
}

export function customSentMarker(mailingId: string, slot: string): string {
  return `data-mail-period="custom:${mailingId}:${slot}"`;
}

export function customEligible(
  student: { id: string; status: string; email: string; emailNotifications: boolean },
  plan: Pick<CustomMailingPlan, "audience" | "studentIds">,
): boolean {
  if (student.status !== "APPROVED") return false;
  if (!student.emailNotifications) return false;
  if (!student.email.includes("@")) return false;
  if (plan.audience === "chosen" && !parseStudentIds(plan.studentIds).includes(student.id)) return false;
  return true;
}
