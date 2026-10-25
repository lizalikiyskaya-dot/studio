import { addDays } from "@/features/streak/weeks";
import { BADGES, BADGE_BY_ID, type BadgeDef } from "./catalogue";

export type BadgeFacts = {
  submittedTasks: number;
  acceptedTaskTitles: readonly string[];
  acceptedChapters: number;
  weeklySubmissions: number;
  earnedStars: number;
  bookComplete: boolean;
  contestSent: boolean;
  contestRejected: boolean;
  contestAccepted: boolean;
  publisherSent: boolean;
  publisherAccepted: boolean;
  streakBest: number;
  countedWeeks: readonly string[];
  vacationWeeks: readonly string[];
};

export function emptyBadgeFacts(): BadgeFacts {
  return {
    submittedTasks: 0,
    acceptedTaskTitles: [],
    acceptedChapters: 0,
    weeklySubmissions: 0,
    earnedStars: 0,
    bookComplete: false,
    contestSent: false,
    contestRejected: false,
    contestAccepted: false,
    publisherSent: false,
    publisherAccepted: false,
    streakBest: 0,
    countedWeeks: [],
    vacationWeeks: [],
  };
}

const METHODICALS = BADGES.filter((badge) => badge.code);

function startsWithCode(cleaned: string, code: string): boolean {
  if (!cleaned.startsWith(code)) return false;
  const next = cleaned.charAt(code.length);
  return next === "" || next === " " || next === ".";
}

function mentionsMethodicalCode(cleaned: string, code: string): boolean {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`методич\\p{L}*\\s*№?\\s*${escaped}(?:\\s|\\.|$)`, "u").test(cleaned);
}

/** Ключевая методичка по названию файла или принятого задания. */
export function matchKeyMethodical(title: string): BadgeDef | null {
  const cleaned = title.trim().toLocaleLowerCase("ru-RU");
  if (!cleaned) return null;
  const ordered = [...METHODICALS].sort((a, b) => (b.code?.length ?? 0) - (a.code?.length ?? 0));
  for (const badge of ordered) {
    const code = badge.code?.toLocaleLowerCase("ru-RU");
    if (!code) continue;
    if (badge.phrase && cleaned.includes(badge.phrase.toLocaleLowerCase("ru-RU"))) return badge;
    if (startsWithCode(cleaned, code) || mentionsMethodicalCode(cleaned, code)) return badge;
  }
  return null;
}

export function methodicalBadgeIdsForTitles(titles: readonly string[]): string[] {
  const ids: string[] = [];
  for (const title of titles) {
    const match = matchKeyMethodical(title);
    if (match && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

/**
 * Перерыв от трёх недель: между двумя засчитанными понедельниками
 * есть минимум три недели, которые не каникулы.
 */
export function returnedAfterBreak(credits: readonly string[], vacations: readonly string[]): boolean {
  const unique = [...new Set(credits)].sort();
  const vacation = new Set(vacations);
  for (let index = 1; index < unique.length; index += 1) {
    const prev = unique[index - 1];
    const next = unique[index];
    let missed = 0;
    for (let week = addDays(prev, 7); week < next; week = addDays(week, 7)) {
      if (!vacation.has(week)) missed += 1;
    }
    if (missed >= 3) return true;
  }
  return false;
}

/** Какие значки сайт ставит сам. Ручные сюда не входят и повторно не выдаются. */
export function autoBadgeIds(facts: BadgeFacts): string[] {
  const ids: string[] = [];
  const want = (id: string, ok: boolean) => {
    if (ok) ids.push(id);
  };
  want("first-page", facts.submittedTasks >= 1);
  want("first-week", facts.weeklySubmissions >= 1);
  want("first-chapter", facts.acceptedChapters >= 1);
  want("ten-tasks", facts.submittedTasks >= 10);
  want("book-done", facts.bookComplete);
  for (const id of methodicalBadgeIdsForTitles(facts.acceptedTaskTitles)) want(id, true);
  want("first-entry", facts.contestSent);
  want("first-no", facts.contestRejected);
  want("contest-yes", facts.contestAccepted);
  want("publisher", facts.publisherSent);
  want("publisher-yes", facts.publisherAccepted);
  want("spark", facts.streakBest >= 4);
  want("candle", facts.streakBest >= 8);
  want("lighthouse", facts.streakBest >= 12);
  want("back-in-line", returnedAfterBreak(facts.countedWeeks, facts.vacationWeeks));
  want("level-5", facts.earnedStars >= 5);
  want("level-25", facts.earnedStars >= 25);
  want("level-70", facts.earnedStars >= 70);
  want("level-100", facts.earnedStars >= 100);
  want("level-150", facts.earnedStars >= 150);
  return ids;
}

/** Уже существующая строка, в том числе снятая, снова сама не появляется. */
export function missingAutoBadgeIds(wanted: readonly string[], already: readonly string[]): string[] {
  const have = new Set(already);
  return wanted.filter((id) => !have.has(id));
}

export function badgeProgress(id: string, facts: BadgeFacts): { current: number; total: number } | null {
  const badge = BADGE_BY_ID.get(id);
  if (!badge?.progress) return null;
  const total = badge.progress.total;
  const raw =
    badge.progress.kind === "tasks"
      ? facts.submittedTasks
      : badge.progress.kind === "stars"
        ? facts.earnedStars
        : facts.streakBest;
  return { current: Math.max(0, Math.min(raw, total)), total };
}

export function hintFor(badge: { hint: string; hintFormal: string }, formal: boolean): string {
  return formal ? badge.hintFormal : badge.hint;
}

export function galleryLead(formal: boolean): string {
  if (formal) {
    return "Цветной значок уже Ваш. Серый ещё можно получить: под ним написано, что для этого нужно.";
  }
  return "Цветной значок уже твой. Серый ещё можно получить: под ним написано, что для этого нужно.";
}

export function widgetLine(open: number): string {
  if (open <= 0) return "Все значки уже получены";
  return `Ещё ${open} можно получить`;
}

export function widgetBadges<T extends { earned: boolean; awardedAt: string | null; sortOrder: number }>(items: readonly T[]): T[] {
  const earned = items
    .filter((item) => item.earned)
    .sort((a, b) => (b.awardedAt ?? "").localeCompare(a.awardedAt ?? ""));
  const locked = items.filter((item) => !item.earned).sort((a, b) => a.sortOrder - b.sortOrder);
  return [...earned, ...locked].slice(0, 3);
}

export function badgesStillOpen(total: number, earned: number): number {
  return Math.max(0, total - earned);
}

export function guideBadgeId(guideId: string): string {
  return `guide-${guideId}`;
}

export function guideBadgeCopy(title: string): { title: string; hint: string; hintFormal: string } {
  const name = title.replace(/\s+/g, " ").trim().slice(0, 80) || "Новая методичка";
  return {
    title: name,
    hint: `Прими задание по методичке «${name}».`,
    hintFormal: `Примите задание по методичке «${name}».`,
  };
}
