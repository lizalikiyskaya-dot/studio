import { ruPlural } from "./rules";

/** Строка журнала, из которой собирается подпись «за что». */
export type StarReasonSource = {
  kind: string;
  sourceId: string;
  note: string;
};

/**
 * За что начислены звёзды. Берётся из уже записанных kind, note и sourceId.
 * Новых колонок для этого нет.
 */
export function starAwardReason(row: StarReasonSource): string {
  const note = row.note.trim();
  if (note) return note;
  switch (row.kind) {
    case "WEEKLY":
      return "задание недели";
    case "MAIN_TASK":
      return "основное задание";
    case "CONTEST":
      return "отправка на конкурс";
    case "PUBLISHER":
      return "отправка в издательство";
    case "CHAPTER":
      return "принятая глава";
    case "STREAK": {
      const weeks = Number(row.sourceId);
      if (Number.isInteger(weeks) && weeks > 0) {
        return `серия ${weeks} ${ruPlural(weeks, "неделя", "недели", "недель")}`;
      }
      return "серия";
    }
    case "GUIDE":
      return "покупка методички";
    default:
      return "начисление";
  }
}

/** +N или −N. Ноль остаётся нулём, без знака. */
export function starHistoryDelta(points: number): string {
  if (!Number.isFinite(points) || points === 0) return "0";
  if (points > 0) return `+${points}`;
  return `−${Math.abs(points)}`;
}

/** Свежие сверху: соседние строки одного дня собираются в одну группу. */
export function groupStarHistory<T extends { at: string }>(rows: T[]): { date: string; rows: T[] }[] {
  const groups: { date: string; rows: T[] }[] = [];
  for (const row of rows) {
    const date = starHistoryDate(row.at) || "Без даты";
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.rows.push(row);
    else groups.push({ date, rows: [row] });
  }
  return groups;
}

/** Дата начисления по Москве, без «г.». */
export function starHistoryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const day = pick("day");
  const month = pick("month");
  const year = pick("year");
  if (!day || !month || !year) return "";
  return `${day} ${month} ${year}`;
}
