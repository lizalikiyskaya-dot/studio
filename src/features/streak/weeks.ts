import { ruPlural } from "@/features/stars/rules";
import { moscowToday } from "@/features/weekly/schedule";

export type WeekCell = "counted" | "vacation" | "miss" | "open";

export type StreakWeekCell = {
  start: string;
  state: WeekCell;
  vacation: boolean;
};

export type StreakPlaque = {
  weeks: StreakWeekCell[];
  current: number;
  best: number;
  freshStart: boolean;
  runStarts: string[];
  countedStarts: string[];
};

const CHAPTER_STREAK = new Set(["SUBMITTED", "IN_REVIEW", "ACCEPTED"]);

/** Глава засчитывает неделю на «сдана», «на проверке» или «принята». */
export function chapterCountsForStreak(status: string): boolean {
  return CHAPTER_STREAK.has(status);
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Понедельник московской календарной даты. Неделя с понедельника по воскресенье. */
export function moscowMonday(now = new Date()): string {
  const iso = moscowToday(now);
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const delta = weekday === 0 ? 6 : weekday - 1;
  return addDays(iso, -delta);
}

export function visibleMondays(now = new Date(), count = 12): string[] {
  const current = moscowMonday(now);
  const starts: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) starts.push(addDays(current, -7 * index));
  return starts;
}

export function weeksLabel(count: number): string {
  return `${count} ${ruPlural(count, "неделя", "недели", "недель")}`;
}

/** 4 недели — 3, 8 — 5, 12 — 8, дальше каждые 4 недели — 3. Между порогами бонуса нет. */
export function streakBonus(length: number): number | null {
  if (length < 4 || length % 4 !== 0) return null;
  if (length === 8) return 5;
  if (length === 12) return 8;
  return 3;
}

export function streakMilestones(best: number): { length: number; points: number }[] {
  const milestones: { length: number; points: number }[] = [];
  for (let length = 4; length <= best; length += 4) {
    const points = streakBonus(length);
    if (points != null) milestones.push({ length, points });
  }
  return milestones;
}

/**
 * Серия по засчитанным неделям. Каникулы не прибавляют неделю и не обнуляют серию.
 * Текущая незакрытая неделя без события серию не рвёт.
 */
export function evaluateStreak(credits: readonly string[], vacations: readonly string[], now = new Date()): StreakPlaque {
  const currentMonday = moscowMonday(now);
  const creditSet = new Set(credits);
  const vacationSet = new Set(vacations);
  const known = [...creditSet, ...vacationSet, currentMonday].sort();
  const earliest = known[0] ?? currentMonday;

  let run = 0;
  let best = 0;
  let had = false;
  let broken = false;
  const runStarts: string[] = [];

  for (let week = earliest; week <= currentMonday; week = addDays(week, 7)) {
    const isCurrent = week === currentMonday;
    if (creditSet.has(week)) {
      run += 1;
      if (run === 1) runStarts.length = 0;
      runStarts.push(week);
      best = Math.max(best, run);
      had = true;
    } else if (vacationSet.has(week)) {
      // мост: серия продолжается
    } else if (!isCurrent) {
      if (had && run > 0) broken = true;
      run = 0;
      runStarts.length = 0;
    }
  }

  const weeks = visibleMondays(now).map((start) => ({
    start,
    vacation: vacationSet.has(start),
    state: (creditSet.has(start)
      ? "counted"
      : vacationSet.has(start)
        ? "vacation"
        : start === currentMonday
          ? "open"
          : "miss") as WeekCell,
  }));

  return {
    weeks,
    current: run,
    best,
    freshStart: broken && run === 0,
    runStarts: [...runStarts],
    countedStarts: [...creditSet].sort(),
  };
}

/** Сколько последних недель текущей серии ученик ещё не видел. */
export function unseenRunWeeks(runStarts: readonly string[], seen: ReadonlySet<string>): number {
  let count = 0;
  for (let index = runStarts.length - 1; index >= 0; index -= 1) {
    if (seen.has(runStarts[index])) break;
    count += 1;
  }
  return count;
}
