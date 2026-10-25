const PREFIX = "liza-studio-stars-seen:";

export function seenStarsKey(studentId: string): string {
  return PREFIX + studentId;
}

/** null: браузер ещё не видел журнал этого ученика. Тогда текущие строки помечаем без анимации. */
export function readSeenStars(storage: Pick<Storage, "getItem">, studentId: string): string[] | null {
  const raw = storage.getItem(seenStarsKey(studentId));
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writeSeenStars(storage: Pick<Storage, "setItem">, studentId: string, ids: readonly string[]) {
  const unique = [...new Set(ids)].slice(-500);
  storage.setItem(seenStarsKey(studentId), JSON.stringify(unique));
}
