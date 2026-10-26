import { progressPercent } from "@/features/acts/chapterText";
import { chapterTone, isChapterReview, type ChapterReviewValue, type ChapterTone } from "@/features/books/chapterReview";

export const STORY_STATUS: Record<ChapterReviewValue, string> = {
  IN_PROGRESS: "в процессе",
  SUBMITTED: "сдано",
  IN_REVIEW: "на проверке",
  NEEDS_REVISION: "на доработке",
  ACCEPTED: "принято",
};

export function storyCount(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.round(number);
}

export function storyPercent(written: unknown, planned: unknown) {
  const plannedCount = storyCount(planned);
  if (plannedCount <= 0) return 0;
  const percent = progressPercent(storyCount(written), plannedCount);
  return Number.isFinite(percent) ? Math.max(0, percent) : 0;
}

export function storyReviewValue(status: string | null | undefined): ChapterReviewValue {
  return status && isChapterReview(status) ? status : "IN_PROGRESS";
}

export function storyStatusLabel(status: string | null | undefined) {
  return STORY_STATUS[storyReviewValue(status)];
}

export function storyCardTone(status: string | null | undefined, written: unknown, planned: unknown): ChapterTone {
  return chapterTone(storyReviewValue(status), storyCount(written), storyCount(planned));
}
