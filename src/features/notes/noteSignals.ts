export type ViewerRole = "MENTOR" | "STUDENT";

export type ActivityItem = { id: string; author: string };

export function openNoteCount(notes: { resolved: boolean }[]) {
  return notes.filter((note) => !note.resolved).length;
}

/** Свои заметки и комментарии не считаются непрочитанными и не звенят. */
export function fromOther(viewer: ViewerRole, author: string) {
  if (viewer === "MENTOR") return author !== "MENTOR" && author !== "Наставник";
  return author !== "STUDENT" && author !== "Ученик";
}

export function activityItems(
  notes: { id: string; authorRole: string }[],
  comments: Record<string, { id: string; author: string }[]>,
): ActivityItem[] {
  const items: ActivityItem[] = notes.map((note) => ({ id: note.id, author: note.authorRole }));
  for (const list of Object.values(comments)) {
    for (const comment of list) items.push({ id: comment.id, author: comment.author });
  }
  return items;
}

/** Новые id с момента прошлого снимка. Свои не попадают в play. */
export function incomingChimes(known: ReadonlySet<string>, items: ActivityItem[], viewer: ViewerRole) {
  const play: string[] = [];
  const next = new Set(known);
  for (const item of items) {
    if (next.has(item.id)) continue;
    next.add(item.id);
    if (fromOther(viewer, item.author)) play.push(item.id);
  }
  return { next, play };
}

export function unreadIds(seen: ReadonlySet<string>, items: ActivityItem[], viewer: ViewerRole) {
  return items.filter((item) => fromOther(viewer, item.author) && !seen.has(item.id)).map((item) => item.id);
}

export function seenStorageKey(studentId: string, viewer: ViewerRole) {
  return `studio-notes-seen:${viewer}:${studentId}`;
}
