import type { SubmissionStatus, TaskStatus } from "@/generated/prisma/client";

/**
 * Звёзды кабинета.
 *
 * 2 — задание недели, один раз за неделю в момент сдачи формы.
 * 3 — основное задание Лизы, один раз когда статус стал «сдано на проверку»
 *     или «принято». «На доработке» само по себе сдачей не считается.
 * 5 — конкурс, 10 — издательство: один раз на строку трекера, когда статус
 *     стал «отправлено», «ждём ответа», «принято» или «отклонено».
 *     «Не отправлено» звёзды не даёт. Снятие отметки звёзды не забирает.
 *
 * Уже начисленные звёзды не снимаются, если статус или текст потом меняют.
 * Прошлые задания, конкурсы и заявки задним числом не пересчитываются:
 * звёзды появляются только в момент события после включения этой системы.
 */

export const STAR_POINTS = {
  WEEKLY: 2,
  MAIN_TASK: 3,
  CONTEST: 5,
  PUBLISHER: 10,
} as const;

export type StarKindName = keyof typeof STAR_POINTS;

export const AUTHOR_RANKS = [
  { min: 0, title: "Начинающий автор" },
  { min: 10, title: "Автор черновиков" },
  { min: 25, title: "Рассказчик" },
  { min: 45, title: "Мастер сцены" },
  { min: 70, title: "Романист" },
  { min: 100, title: "Достоевский" },
] as const;

export function ruPlural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const n10 = abs % 10;
  const n100 = abs % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

export function starsLabel(n: number): string {
  return `${n} ${ruPlural(n, "звёздочка", "звёздочки", "звёздочек")}`;
}

export function rankForStars(total: number) {
  let index = 0;
  for (let i = 0; i < AUTHOR_RANKS.length; i++) {
    if (total >= AUTHOR_RANKS[i].min) index = i;
  }
  const current = AUTHOR_RANKS[index];
  const next = AUTHOR_RANKS[index + 1] ?? null;
  return {
    current,
    next,
    remaining: next ? next.min - total : 0,
  };
}

export function mainTaskAwardsStars(status: TaskStatus): boolean {
  return status === "SUBMITTED" || status === "ACCEPTED";
}

/** Любой статус, кроме «не отправлено», значит, что текст уже ушёл. */
export function submissionReadyForStars(status: SubmissionStatus): boolean {
  return status !== "NOT_SENT";
}
