/**
 * Очередь цитаты дня для кабинета и письма.
 * Первые восемь строк — цитаты, добавленные файлом 2026-10-26-9: они есть в живой базе,
 * даже если пять старых id уже отсутствуют. Дальше авторы встают тем же перебором,
 * что и spaceQuotesByAuthor: больший шаг, ранняя позиция, возврат назад.
 * Для одного и того же списка результат один.
 */
export const DAILY_QUOTE_WEEK_IDS = [
  "quote-093",
  "quote-109",
  "quote-119",
  "quote-120",
  "quote-071",
  "quote-105",
  "quote-064",
  "quote-112",
] as const;

export function orderDailyQuotes<T extends { author: string }>(
  items: readonly T[],
  idOf: (item: T) => string,
): T[] {
  const count = items.length;
  if (count <= 1) return [...items];
  const byId = new Map(items.map((item) => [idOf(item), item]));
  const fixed = DAILY_QUOTE_WEEK_IDS.map((id) => {
    const item = byId.get(id);
    if (!item) throw new Error(`в очереди нет ${id}`);
    return item;
  });

  const place = (gap: number): T[] | null => {
    const groups = new Map<string, T[]>();
    const seen: string[] = [];
    const fixedIds = new Set<string>(DAILY_QUOTE_WEEK_IDS);
    for (const item of items) {
      if (fixedIds.has(idOf(item))) continue;
      const bucket = groups.get(item.author);
      if (bucket) bucket.push(item);
      else {
        groups.set(item.author, [item]);
        seen.push(item.author);
      }
    }
    const authors = [...seen].sort((left, right) => {
      const diff = groups.get(right)!.length - groups.get(left)!.length;
      if (diff !== 0) return diff;
      return seen.indexOf(left) - seen.indexOf(right);
    });
    const occupied = Array(count).fill(false);
    const slots: Array<T | undefined> = Array(count);
    fixed.forEach((item, index) => {
      slots[index] = item;
      occupied[index] = true;
    });
    const distance = (from: number, to: number) => {
      const delta = Math.abs(from - to);
      return Math.min(delta, count - delta);
    };
    let nodes = 0;
    const search = (authorIndex: number): boolean => {
      if (authorIndex === authors.length) return true;
      if (nodes > 2_000_000) return false;
      const quotes = groups.get(authors[authorIndex])!;
      const need = quotes.length;
      for (let step = Math.floor(count / need); step >= gap; step--) {
        for (let start = 0; start < count; start++) {
          nodes += 1;
          if (nodes > 2_000_000) return false;
          const positions: number[] = [];
          let fits = true;
          for (let k = 0; k < need; k++) {
            const pos = (start + k * step) % count;
            if (occupied[pos] || positions.includes(pos)) {
              fits = false;
              break;
            }
            for (const prev of positions) {
              if (distance(pos, prev) < gap) {
                fits = false;
                break;
              }
            }
            if (!fits) break;
            for (let index = 0; index < count; index++) {
              if (occupied[index] && slots[index]?.author === quotes[0].author && distance(pos, index) < gap) {
                fits = false;
                break;
              }
            }
            if (!fits) break;
            positions.push(pos);
          }
          if (!fits) continue;
          for (const pos of positions) occupied[pos] = true;
          if (search(authorIndex + 1)) {
            positions.forEach((pos, index) => {
              slots[pos] = quotes[index];
            });
            return true;
          }
          for (const pos of positions) occupied[pos] = false;
        }
      }
      return false;
    };
    if (!search(0) || slots.some((slot) => !slot)) return null;
    return slots as T[];
  };

  for (const gap of [8, 7]) {
    const placed = place(gap);
    if (placed) return placed;
  }
  throw new Error("не удалось развести авторов");
}
