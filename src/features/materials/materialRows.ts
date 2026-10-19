export type TitleSave = { id: string; title: string };

/** Next `order` for a new row. Count collides when orders have a hole or a tie. */
export function nextMaterialOrder(existingOrders: readonly number[]): number {
  let max = -1;
  for (const order of existingOrders) {
    if (order > max) max = order;
  }
  return max + 1;
}

/** The id is the one stamped on the field that blurred, not a sibling row. */
export function titleSaveFromField(fieldId: string | undefined, value: string): TitleSave | null {
  if (!fieldId) return null;
  return { id: fieldId, title: value };
}

export function applyMaterialTitles<T extends { id: string; title: string }>(
  items: readonly T[],
  saves: readonly TitleSave[],
): T[] {
  const titles = new Map<string, string>();
  for (const save of saves) titles.set(save.id, save.title);
  return items.map((item) => {
    const title = titles.get(item.id);
    if (title === undefined || title === item.title) return item;
    return { ...item, title };
  });
}

/** A repeated create result must not become a second row that shares the first id. */
export function appendMaterial<T extends { id: string }>(items: readonly T[], created: T): T[] {
  if (items.some((item) => item.id === created.id)) return items as T[];
  return [...items, created];
}

/**
 * Saves for one id run in order. A slow save cannot be replaced by another
 * row's title, and a later edit of the same row waits for the earlier one.
 */
export function enqueueById(
  queues: Map<string, Promise<void>>,
  id: string,
  run: () => Promise<void>,
): void {
  const previous = queues.get(id) ?? Promise.resolve();
  const next = previous.then(run, run);
  queues.set(id, next);
  void next.then(
    () => undefined,
    () => undefined,
  );
}

/** The next create starts only after the previous row has been appended. */
export function enqueueCreate<T>(
  previous: Promise<void>,
  create: () => Promise<T>,
  commit: (created: T) => void,
): Promise<void> {
  const run = previous.catch(() => undefined).then(async () => {
    const created = await create();
    commit(created);
  });
  return run.then(
    () => undefined,
    () => undefined,
  );
}
