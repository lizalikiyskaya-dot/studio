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
 * 3 — глава трекера, один раз когда статус стал «принята».
 *     «Сдана» и «на проверке» звёзды не дают. Снятие статуса звёзды не забирает.
 *
 * «Заработано» — сумма начислений, по ней статус. «На счету» — начисления минус траты.
 * Пока трат нет, числа равны. Уже начисленные звёзды не снимаются.
 * Прошлая работа дописывается файлами docs/sql/2026-10-20-star-backfill.sql
 * и docs/sql/2026-10-26-2-star-chapter.sql. Повтор того же источника очки не удваивает.
 */

/** Разовая строка журнала: доплата до 100 за завершённую книгу, не задание. */
export const BOOK_COMPLETE_SOURCE_ID = "book-complete";
export const BOOK_COMPLETE_NOTE = "завершение книги";
export const BOOK_COMPLETE_TOTAL = 100;
/** Сверяется по имени «Надежда». Если id другой, берётся единственная Надежда. */
export const NADEZHDA_USER_ID = "cmqz75vnn000v0qmokx9zgt89";

export const STAR_POINTS = {
  WEEKLY: 2,
  MAIN_TASK: 3,
  CONTEST: 5,
  PUBLISHER: 10,
  CHAPTER: 3,
} as const;

/** Короткая легенда под счётчиком. Те же суммы, что в окне «За что дают звёзды». */
export const STAR_LEGEND = [
  { points: STAR_POINTS.WEEKLY, label: "задание недели" },
  { points: STAR_POINTS.MAIN_TASK, label: "основное задание" },
  { points: STAR_POINTS.CHAPTER, label: "принятая глава" },
  { points: STAR_POINTS.CONTEST, label: "отправка на конкурс" },
  { points: STAR_POINTS.PUBLISHER, label: "отправка в издательство" },
] as const;

export type StarKindName = keyof typeof STAR_POINTS;

export const AUTHOR_RANKS = [
  { min: 0, title: "Начинающий автор" },
  { min: 5, title: "Сочинитель" },
  { min: 10, title: "Автор черновиков" },
  { min: 17, title: "Автор первой главы" },
  { min: 25, title: "Рассказчик" },
  { min: 35, title: "Мастер диалога" },
  { min: 45, title: "Мастер сцены" },
  { min: 57, title: "Архитектор сюжета" },
  { min: 70, title: "Романист" },
  { min: 85, title: "Автор рукописи" },
  { min: 100, title: "Достоевский" },
  { min: 150, title: "Живой классик" },
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

export function rankProgressLine(total: number): string {
  const { next, remaining } = rankForStars(total);
  if (!next) return "высший статус";
  return `до статуса «${next.title}» ещё ${starsLabel(remaining)}`;
}

export function mainTaskAwardsStars(status: TaskStatus): boolean {
  return status === "SUBMITTED" || status === "ACCEPTED";
}

/** Глава даёт звёзды только когда наставник поставил «принята». */
export function chapterAwardsStars(status: string): boolean {
  return status === "ACCEPTED";
}

/** Любой статус, кроме «не отправлено», значит, что текст уже ушёл. */
export function submissionReadyForStars(status: SubmissionStatus): boolean {
  return status !== "NOT_SENT";
}
