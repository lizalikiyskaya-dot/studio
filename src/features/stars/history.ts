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
