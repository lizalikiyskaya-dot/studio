export type DatedTask = { id: string; publishedOn: string };

/** Календарная дата Europe/Moscow, YYYY-MM-DD. */
export function moscowToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatWeeklyDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Текущее задание — последнее, чья дата уже наступила (включая сегодня).
 * Следующее — ближайшее будущее. После последней даты текущим остаётся оно.
 */
export function pickWeekly<T extends DatedTask>(tasks: T[], today: string): { current: T | null; upcoming: T | null } {
  const sorted = [...tasks].sort((a, b) => a.publishedOn.localeCompare(b.publishedOn) || a.id.localeCompare(b.id));
  let current: T | null = null;
  let upcoming: T | null = null;
  for (const task of sorted) {
    if (task.publishedOn <= today) current = task;
    else if (!upcoming) upcoming = task;
  }
  return { current, upcoming };
}

export type WeekPhase = "current" | "upcoming" | "past";

export function weekPhase(task: DatedTask, today: string, currentId: string | null): WeekPhase {
  if (currentId && task.id === currentId) return "current";
  if (task.publishedOn > today) return "upcoming";
  return "past";
}
