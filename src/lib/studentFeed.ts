import { sectionLabel } from "@/lib/sections";

export const STUDENT_FEED_DAYS = 21;
export const STUDENT_FEED_POPUP = 8;

export type StudentFeedKind = "task-accepted" | "task-revision" | "task-new" | "note" | "edit";

export type StudentFeedItem = {
  kind: StudentFeedKind;
  sourceId: string;
  label: string;
  detail: string;
  href: string;
  at: string;
  seen: boolean;
  needsAction: boolean;
};

type TaskRow = { id: string; title: string; status: string; createdAt: Date; updatedAt: Date };
type NoteRow = {
  id: string;
  text: string;
  anchorLabel: string;
  anchorUrl: string;
  createdAt: Date;
  updatedAt: Date;
  resolved: boolean;
  authorRole: string;
};
type EditRow = { section: string; at: Date; byRole: string };
type SeenRow = { kind: string; sourceId: string; seenAt: Date; dismissedAt?: Date | null };

function fresh(at: Date, now: Date): boolean {
  return now.getTime() - at.getTime() <= STUDENT_FEED_DAYS * 24 * 60 * 60 * 1000 && at.getTime() <= now.getTime() + 60_000;
}

function seenRow(seen: SeenRow[], kind: string, sourceId: string): SeenRow | undefined {
  return seen.find((item) => item.kind === kind && item.sourceId === sourceId);
}

function wasSeen(seen: SeenRow[], kind: string, sourceId: string, at: Date): boolean {
  const row = seenRow(seen, kind, sourceId);
  return Boolean(row && row.seenAt.getTime() >= at.getTime());
}

function wasDismissed(seen: SeenRow[], kind: string, sourceId: string, at: Date): boolean {
  const row = seenRow(seen, kind, sourceId);
  return Boolean(row?.dismissedAt && row.dismissedAt.getTime() >= at.getTime());
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 140);
}

function noteHref(basePath: string, url: string): string {
  const value = url.trim();
  if (value.startsWith("/")) return value;
  return `${basePath}/tasks`;
}

export function openStudentLabel(kind: StudentFeedKind): string {
  if (kind === "note") return "Открыть заметку";
  if (kind === "edit") return "Открыть раздел";
  return "Открыть задание";
}

export function buildStudentFeed(input: {
  now: Date;
  basePath?: string;
  /** Полная история для страницы «Все уведомления». В колокольчике только свежие. */
  full?: boolean;
  tasks: TaskRow[];
  notes: NoteRow[];
  edits: EditRow[];
  seen: SeenRow[];
}): StudentFeedItem[] {
  const base = input.basePath ?? "/dashboard";
  const items: StudentFeedItem[] = [];

  for (const task of input.tasks) {
    const title = oneLine(task.title);
    if (!title) continue;
    if (task.status === "ACCEPTED" && (input.full || fresh(task.updatedAt, input.now))) {
      if (wasDismissed(input.seen, "task-accepted", task.id, task.updatedAt)) continue;
      items.push({
        kind: "task-accepted",
        sourceId: task.id,
        label: "Наставник принял задание",
        detail: title,
        href: `${base}/tasks?tab=accepted#task-${task.id}`,
        at: task.updatedAt.toISOString(),
        seen: wasSeen(input.seen, "task-accepted", task.id, task.updatedAt),
        needsAction: true,
      });
      continue;
    }
    if (task.status === "NEEDS_REVISION" && (input.full || fresh(task.updatedAt, input.now))) {
      if (wasDismissed(input.seen, "task-revision", task.id, task.updatedAt)) continue;
      items.push({
        kind: "task-revision",
        sourceId: task.id,
        label: "Наставник отправил на доработку",
        detail: title,
        href: `${base}/tasks?tab=revision#task-${task.id}`,
        at: task.updatedAt.toISOString(),
        seen: wasSeen(input.seen, "task-revision", task.id, task.updatedAt),
        needsAction: true,
      });
      continue;
    }
    if (task.status !== "ACCEPTED" && task.status !== "NEEDS_REVISION" && (input.full || fresh(task.createdAt, input.now))) {
      if (wasDismissed(input.seen, "task-new", task.id, task.createdAt)) continue;
      items.push({
        kind: "task-new",
        sourceId: task.id,
        label: "Новое задание",
        detail: title,
        href: `${base}/tasks#task-${task.id}`,
        at: task.createdAt.toISOString(),
        seen: wasSeen(input.seen, "task-new", task.id, task.createdAt),
        needsAction: true,
      });
    }
  }

  for (const note of input.notes) {
    if (note.authorRole !== "MENTOR" || note.resolved) continue;
    const at = note.updatedAt.getTime() >= note.createdAt.getTime() ? note.updatedAt : note.createdAt;
    if (!input.full && !fresh(at, input.now)) continue;
    if (wasDismissed(input.seen, "note", note.id, at)) continue;
    const text = oneLine(note.text);
    if (!text) continue;
    items.push({
      kind: "note",
      sourceId: note.id,
      label: "Заметка наставника",
      detail: note.anchorLabel.trim() ? `${oneLine(note.anchorLabel)}: ${text}` : text,
      href: noteHref(base, note.anchorUrl),
      at: at.toISOString(),
      seen: wasSeen(input.seen, "note", note.id, at),
      needsAction: false,
    });
  }

  for (const edit of input.edits) {
    if (edit.byRole !== "MENTOR") continue;
    if (edit.section === "tasks" || edit.section === "notes") continue;
    if (!input.full && !fresh(edit.at, input.now)) continue;
    if (wasDismissed(input.seen, "edit", edit.section, edit.at)) continue;
    items.push({
      kind: "edit",
      sourceId: edit.section,
      label: "Правка наставника",
      detail: sectionLabel(edit.section),
      href: `${base}/${edit.section}`,
      at: edit.at.toISOString(),
      seen: wasSeen(input.seen, "edit", edit.section, edit.at),
      needsAction: false,
    });
  }

  const sorted = items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return input.full ? sorted : sorted.slice(0, 40);
}

export function filterStudentFeed(items: StudentFeedItem[], type: "all" | "tasks" | "edits"): StudentFeedItem[] {
  if (type === "tasks") return items.filter((item) => item.needsAction);
  if (type === "edits") return items.filter((item) => !item.needsAction);
  return items;
}
