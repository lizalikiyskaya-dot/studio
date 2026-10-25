const PREFIX = "liza-studio-badges-seen:";

export function seenBadgesKey(studentId: string): string {
  return PREFIX + studentId;
}

/** null: галерею этого ученика ещё не открывали. Текущие значки помечаем без анимации. */
export function readSeenBadges(storage: Pick<Storage, "getItem">, studentId: string): string[] | null {
  const raw = storage.getItem(seenBadgesKey(studentId));
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writeSeenBadges(storage: Pick<Storage, "setItem">, studentId: string, ids: readonly string[]) {
  const unique = [...new Set(ids)].slice(-400);
  storage.setItem(seenBadgesKey(studentId), JSON.stringify(unique));
}
