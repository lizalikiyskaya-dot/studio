export const FEED_KINDS = ["task", "chapter", "exercises", "weekly", "section"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

export type FeedDraft = {
  kind: FeedKind;
  sourceId: string;
  studentId: string;
  student: string;
  needsAction: boolean;
  label: string;
  detail: string;
  at: string;
  href: string;
};

export type FeedItem = FeedDraft & { seen: boolean };

export const MENTOR_FEED_POPUP = 8;

export type SeenMark = { kind: string; sourceId: string; seenAt: string; dismissedAt?: string | null };

export function isFeedKind(value: string): value is FeedKind {
  return (FEED_KINDS as readonly string[]).includes(value);
}

export function feedKey(kind: string, sourceId: string): string {
  return `${kind}:${sourceId}`;
}

/** Событие не прочитано, если отметки нет или источник новее отметки. */
export function isUnseen(at: string, seenAt: string | undefined): boolean {
  if (!seenAt) return true;
  return Date.parse(at) > Date.parse(seenAt);
}

/** «Удалить» прячет событие, пока источник не станет новее отметки. */
export function isDismissed(at: string, dismissedAt: string | null | undefined): boolean {
  if (!dismissedAt) return false;
  return Date.parse(at) <= Date.parse(dismissedAt);
}

export function buildFeed(drafts: FeedDraft[], seen: SeenMark[]): FeedItem[] {
  const marks = new Map(seen.map((row) => [feedKey(row.kind, row.sourceId), row.seenAt]));
  const hidden = new Map(seen.map((row) => [feedKey(row.kind, row.sourceId), row.dismissedAt]));
  return drafts
    .filter((draft) => !isDismissed(draft.at, hidden.get(feedKey(draft.kind, draft.sourceId))))
    .map((draft) => ({
      ...draft,
      seen: !isUnseen(draft.at, marks.get(feedKey(draft.kind, draft.sourceId))),
    }))
    .sort((a, b) => {
      if (a.seen !== b.seen) return a.seen ? 1 : -1;
      if (!a.seen && a.needsAction !== b.needsAction) return a.needsAction ? -1 : 1;
      return Date.parse(b.at) - Date.parse(a.at);
    });
}

export function feedCounts(items: FeedItem[]): { action: number; edits: number; all: number } {
  const open = items.filter((item) => !item.seen);
  const action = open.filter((item) => item.needsAction).length;
  return { action, edits: open.length - action, all: open.length };
}

export function openLabel(kind: FeedKind): string {
  if (kind === "task") return "Открыть задание";
  if (kind === "chapter") return "Открыть главу";
  if (kind === "weekly") return "Открыть неделю";
  if (kind === "exercises") return "Открыть упражнения";
  return "Открыть раздел";
}

export function studentHint(item: FeedItem): string {
  if (item.kind === "chapter") return "Сдана глава · не открыто";
  if (item.kind === "weekly") return "Сдано задание недели · не открыто";
  if (item.kind === "task") return "Сдано задание · не открыто";
  if (item.kind === "exercises") return "Правка в упражнениях";
  return item.detail ? `Правка: ${item.detail}` : "Правка";
}

export function filterFeed(items: FeedItem[], type: "all" | "action" | "edit", studentId: string): FeedItem[] {
  return items.filter((item) => {
    if (studentId && item.studentId !== studentId) return false;
    if (type === "action") return item.needsAction;
    if (type === "edit") return !item.needsAction;
    return true;
  });
}
