const PREFIX = "liza-studio-streak-seen:";

export function seenStreakKey(studentId: string): string {
  return PREFIX + studentId;
}

/** null: браузер ещё не видел серию. Тогда текущие недели помечаем без анимации. */
export function readSeenStreak(storage: Pick<Storage, "getItem">, studentId: string): string[] | null {
  const raw = storage.getItem(seenStreakKey(studentId));
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writeSeenStreak(storage: Pick<Storage, "setItem">, studentId: string, starts: readonly string[]) {
  const unique = [...new Set(starts)].slice(-200);
  storage.setItem(seenStreakKey(studentId), JSON.stringify(unique));
}
