import { reorderArray } from "@/lib/reorder";

/** 1, 2… 10 for the row’s place in the current list. */
export function taskRowNumber(index: number): string {
  return String(index + 1);
}

/**
 * Permute the visible rows and leave hidden ones in their slots.
 * A filtered tab can move its own tasks without pulling other statuses along.
 */
export function applyVisibleOrder<T extends { id: string }>(all: readonly T[], visibleOrdered: readonly T[]): T[] {
  const visibleIds = new Set(visibleOrdered.map((item) => item.id));
  const queue = [...visibleOrdered];
  return all.map((item) => (visibleIds.has(item.id) ? queue.shift()! : item));
}

export function moveWithin<T extends { id: string }>(
  all: readonly T[],
  visibleIds: readonly string[],
  fromId: string,
  toId: string,
): T[] {
  if (fromId === toId) return [...all];
  const byId = new Map(all.map((item) => [item.id, item]));
  const visible = visibleIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const from = visible.findIndex((item) => item.id === fromId);
  const to = visible.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0) return [...all];
  return applyVisibleOrder(all, reorderArray(visible, from, to));
}

export function moveBy<T extends { id: string }>(
  all: readonly T[],
  visibleIds: readonly string[],
  id: string,
  dir: -1 | 1,
): T[] {
  const index = visibleIds.indexOf(id);
  const next = index + dir;
  if (index < 0 || next < 0 || next >= visibleIds.length) return [...all];
  return moveWithin(all, visibleIds, id, visibleIds[next]);
}
