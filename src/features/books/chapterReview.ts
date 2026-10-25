import { progressKind } from "@/features/acts/chapterText";

export const CHAPTER_REVIEW = [
  { value: "IN_PROGRESS", label: "в процессе" },
  { value: "SUBMITTED", label: "сдана" },
  { value: "IN_REVIEW", label: "на проверке" },
  { value: "NEEDS_REVISION", label: "на доработке" },
  { value: "ACCEPTED", label: "принята" },
] as const;

export type ChapterReviewValue = (typeof CHAPTER_REVIEW)[number]["value"];

export type ChapterTone = "progress" | "almost" | "review" | "revision" | "accepted";

const REVIEW_VALUES = new Set<string>(CHAPTER_REVIEW.map((item) => item.value));

export function isChapterReview(value: string): value is ChapterReviewValue {
  return REVIEW_VALUES.has(value);
}

export function chapterReviewLabel(status: ChapterReviewValue) {
  return CHAPTER_REVIEW.find((item) => item.value === status)?.label ?? "в процессе";
}

// Цвет карточки: статус наставника важнее знаков.
// Оранжевый — только «в процессе», когда глава уже почти написана.
export function chapterTone(status: ChapterReviewValue, written: number, planned: number): ChapterTone {
  if (status === "ACCEPTED") return "accepted";
  if (status === "NEEDS_REVISION") return "revision";
  if (status === "SUBMITTED" || status === "IN_REVIEW") return "review";
  const kind = progressKind(written, planned);
  if (kind === "almost" || kind === "done") return "almost";
  return "progress";
}
