/** Сдача задания недели, которую наставник ещё не открывал. */
export type WeeklyReview = {
  id: string;
  weeklyTaskId: string;
  title: string;
  text: string;
  updatedAt: string;
};

/** Строки новее последнего просмотра раздела. Если наставник его не открывал, все. */
export function pendingWeeklyReviews<T extends { updatedAt: string }>(rows: T[], seenAt: string | null): T[] {
  if (!seenAt) return rows;
  const at = Date.parse(seenAt);
  if (Number.isNaN(at)) return rows;
  return rows.filter((row) => {
    const updated = Date.parse(row.updatedAt);
    return !Number.isNaN(updated) && updated > at;
  });
}
