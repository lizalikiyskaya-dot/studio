/** Настройки автоматических писем. Чистые функции, без базы и без SMTP. */

export const MAIL_TIME_ZONES = ["Europe/Moscow", "Asia/Seoul"] as const;
export type MailTimeZone = (typeof MAIL_TIME_ZONES)[number];

export const BROADCAST_KEYS = [
  "payment",
  "weekly-task",
  "daily-quote",
  "deadline",
  "guide",
  "registration",
  "registration-mentor",
  "approved",
  "password",
  "mentor-edit",
  "student-edit",
  "student-online",
  "submitted",
] as const;

export type BroadcastKey = (typeof BROADCAST_KEYS)[number];
export type BroadcastMode = "clock" | "event" | "batch" | "online";
export type BroadcastWho = "students" | "mentor" | "person";

export type BroadcastSetting = {
  key: BroadcastKey;
  enabled: boolean;
  timeZone: MailTimeZone;
  weekdays: string;
  hour: number | null;
  minute: number;
  windowMinutes: number;
  oncePerDay: boolean;
  audience: "all" | "chosen";
  studentIds: string;
  sender: "env" | "profile";
};

export type BroadcastMeta = {
  key: BroadcastKey;
  title: string;
  mode: BroadcastMode;
  who: BroadcastWho;
};

export const BROADCAST_META: BroadcastMeta[] = [
  { key: "payment", title: "День оплаты", mode: "clock", who: "students" },
  { key: "weekly-task", title: "Задание недели", mode: "clock", who: "students" },
  { key: "daily-quote", title: "Цитата дня", mode: "clock", who: "students" },
  { key: "deadline", title: "Напоминание о сроке", mode: "clock", who: "students" },
  { key: "guide", title: "Методичка", mode: "event", who: "students" },
  { key: "registration", title: "Заявка ученику", mode: "event", who: "person" },
  { key: "registration-mentor", title: "Заявка наставнику", mode: "event", who: "mentor" },
  { key: "approved", title: "Доступ открыт", mode: "event", who: "students" },
  { key: "password", title: "Восстановление пароля", mode: "event", who: "person" },
  { key: "mentor-edit", title: "Наставник внёс правку", mode: "batch", who: "students" },
  { key: "student-edit", title: "Ученик внёс правку", mode: "batch", who: "mentor" },
  { key: "student-online", title: "Ученик онлайн", mode: "online", who: "mentor" },
  { key: "submitted", title: "Сдано на проверку", mode: "event", who: "mentor" },
];

const WEEKDAY_LABELS = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** 30 минут тишины: новый заход, а не очередной пинг открытой вкладки. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

export function isBroadcastKey(value: string): value is BroadcastKey {
  return (BROADCAST_KEYS as readonly string[]).includes(value);
}

export function timeZoneLabel(zone: string): string {
  return zone === "Asia/Seoul" ? "Сеул" : "Москва";
}

/**
 * Значения, пока в базе нет строки.
 * Письма о правках и о визите выключены: включение меняет то, что уходит сейчас.
 * День оплаты и письма по событию повторяют текущее поведение.
 */
export function defaultBroadcast(key: BroadcastKey): BroadcastSetting {
  const base: BroadcastSetting = {
    key,
    enabled: false,
    timeZone: "Europe/Moscow",
    weekdays: "",
    hour: null,
    minute: 0,
    windowMinutes: 60,
    oncePerDay: false,
    audience: "all",
    studentIds: "",
    sender: "profile",
  };
  switch (key) {
    case "payment":
      return { ...base, enabled: true, hour: 9, minute: 0, windowMinutes: 180 };
    case "weekly-task":
      return { ...base, enabled: false, weekdays: "6", hour: 10, minute: 0, windowMinutes: 60 };
    case "daily-quote":
      return { ...base, enabled: false, hour: 9, minute: 0, windowMinutes: 60 };
    case "deadline":
      return { ...base, enabled: true, hour: 9, minute: 0, windowMinutes: 60, sender: "env" };
    case "guide":
    case "registration":
    case "registration-mentor":
    case "approved":
    case "password":
      return { ...base, enabled: true, windowMinutes: 0 };
    case "mentor-edit":
    case "student-edit":
      return base;
    case "student-online":
      return { ...base, windowMinutes: 0, oncePerDay: true };
    case "submitted":
      return { ...base, enabled: true, windowMinutes: 0 };
    default: {
      const never: never = key;
      return never;
    }
  }
}

export function parseStudentIds(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

export function audienceAllows(setting: BroadcastSetting, studentId: string | undefined, who: BroadcastWho): boolean {
  if (who !== "students" || setting.audience !== "chosen" || !studentId) return true;
  return parseStudentIds(setting.studentIds).includes(studentId);
}

export type ZonedClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function zonedClock(now: Date, timeZone: string): ZonedClock {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
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
    minute: Number(bag.minute),
    weekday: WEEKDAY_INDEX[bag.weekday] ?? 0,
  };
}

export function calendarDay(now: Date, timeZone: string): string {
  const clock = zonedClock(now, timeZone);
  const month = String(clock.month).padStart(2, "0");
  const day = String(clock.day).padStart(2, "0");
  return `${clock.year}-${month}-${day}`;
}

export function weekdayAllowed(weekday: number, weekdays: string): boolean {
  const list = weekdays.split(",").map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return true;
  return list.includes(String(weekday));
}

/** hour пустой: ограничение по часам нет. Иначе полуинтервал [старт, старт + окно). */
export function clockOpen(
  clock: ZonedClock,
  setting: Pick<BroadcastSetting, "hour" | "minute" | "windowMinutes" | "weekdays">,
): boolean {
  if (!weekdayAllowed(clock.weekday, setting.weekdays)) return false;
  if (setting.hour == null) return true;
  const start = setting.hour * 60 + setting.minute;
  const at = clock.hour * 60 + clock.minute;
  return at >= start && at < start + Math.max(1, setting.windowMinutes);
}

export function isSessionStart(lastSeen: Date | null, now: Date, gapMs = SESSION_GAP_MS): boolean {
  if (!lastSeen) return true;
  return now.getTime() - lastSeen.getTime() >= gapMs;
}

export function sameCalendarDay(left: Date, right: Date, timeZone: string): boolean {
  return calendarDay(left, timeZone) === calendarDay(right, timeZone);
}

export type DigestRow = {
  id: string;
  kind: string;
  studentId: string;
  section: string;
  detail: string;
  createdAt: Date;
  sentAt: Date | null;
};

/** Пачка готова, когда самая ранняя неотправка старше окна. Окно 0: сразу. */
export function groupsReady(rows: DigestRow[], now: Date, windowMinutes: number): DigestRow[][] {
  const byStudent = new Map<string, DigestRow[]>();
  for (const row of rows) {
    if (row.sentAt) continue;
    const list = byStudent.get(row.studentId) ?? [];
    list.push(row);
    byStudent.set(row.studentId, list);
  }
  const windowMs = Math.max(0, windowMinutes) * 60 * 1000;
  const ready: DigestRow[][] = [];
  for (const list of byStudent.values()) {
    const oldest = Math.min(...list.map((row) => row.createdAt.getTime()));
    if (now.getTime() - oldest >= windowMs) ready.push(list);
  }
  return ready;
}

export function mergeDetail(current: string, next: string): string {
  const extra = next.trim();
  if (!extra) return current;
  if (!current.trim()) return extra.slice(0, 240);
  if (current.split("; ").includes(extra)) return current;
  return `${current}; ${extra}`.slice(0, 240);
}

function clockText(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function scheduleLabel(setting: BroadcastSetting, mode: BroadcastMode): string {
  const zone = timeZoneLabel(setting.timeZone);
  if (mode === "event") return "В момент события";
  if (mode === "batch") return `Пачка ${setting.windowMinutes} мин. после первой правки`;
  if (mode === "online") {
    const cap = setting.oncePerDay ? `не чаще раза в сутки, сутки по времени: ${zone}` : "при каждом новом заходе";
    return `Начало захода. ${cap}`;
  }
  const days = setting.weekdays.trim() ? setting.weekdays.split(",").map((item) => WEEKDAY_LABELS[Number(item)] ?? item).join(", ") : "каждый день";
  const start = setting.hour == null ? "весь день" : clockText(setting.hour, setting.minute);
  const end = setting.hour == null ? "" : `, окно ${setting.windowMinutes} мин.`;
  return `${days}, ${start}${end}, ${zone}`;
}

function keepsClock(key: BroadcastKey): boolean {
  return key === "payment" || key === "weekly-task" || key === "daily-quote" || key === "deadline";
}

export function normalizeBroadcast(input: BroadcastSetting): { value: BroadcastSetting; error?: string } {
  if (!isBroadcastKey(input.key)) return { value: input, error: "Такой рассылки нет." };
  const base = defaultBroadcast(input.key);
  const timeZone = MAIL_TIME_ZONES.includes(input.timeZone) ? input.timeZone : base.timeZone;
  const minute = Number.isInteger(input.minute) ? Math.min(59, Math.max(0, input.minute)) : 0;
  let hour: number | null = input.hour;
  if (hour != null && (!Number.isInteger(hour) || hour < 0 || hour > 23)) hour = base.hour;
  const windowMinutes = Number.isInteger(input.windowMinutes) ? Math.min(24 * 60, Math.max(0, input.windowMinutes)) : base.windowMinutes;
  const audience = input.audience === "chosen" ? "chosen" : "all";
  const sender = input.sender === "env" ? "env" : "profile";
  const weekdays = input.weekdays.split(",").map((item) => item.trim()).filter((item) => /^[1-7]$/.test(item)).join(",");
  return {
    value: {
      key: input.key,
      enabled: input.enabled === true,
      timeZone,
      weekdays,
      hour: keepsClock(input.key) ? (hour ?? base.hour ?? 9) : null,
      minute,
      windowMinutes: keepsClock(input.key) ? Math.max(1, windowMinutes) : windowMinutes,
      oncePerDay: input.key === "student-online" ? input.oncePerDay === true : false,
      audience: BROADCAST_META.find((item) => item.key === input.key)?.who === "students" ? audience : "all",
      studentIds: parseStudentIds(input.studentIds).join(","),
      sender,
    },
  };
}
