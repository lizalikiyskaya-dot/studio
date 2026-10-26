/**
 * Очередь цитаты дня. Один и тот же автор не встаёт ближе чем через minGap строк,
 * и на стыке конца списка с началом тоже. Порядок внутри автора сохраняется.
 * При равном расстоянии берётся более ранняя свободная строка: результат один и тот же
 * для одного и того же списка.
 */
export function spaceQuotesByAuthor<T extends { author: string }>(items: readonly T[], minGap = 7): T[] {
  const count = items.length;
  if (count <= 1) return [...items];

  const groups = new Map<string, T[]>();
  const seen: string[] = [];
  for (const item of items) {
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

  const place = (gap: number): T[] | null => {
    const slots: Array<T | undefined> = Array(count);
    const who: Array<string | undefined> = Array(count);
    const distance = (from: number, to: number) => {
      const delta = Math.abs(from - to);
      return Math.min(delta, count - delta);
    };

    for (const author of authors) {
      for (const quote of groups.get(author)!) {
        let best = -1;
        let bestScore = -1;
        for (let index = 0; index < count; index++) {
          if (slots[index]) continue;
          let nearest = count;
          for (let other = 0; other < count; other++) {
            if (who[other] === author) nearest = Math.min(nearest, distance(index, other));
          }
          if (nearest < gap) continue;
          if (nearest > bestScore) {
            bestScore = nearest;
            best = index;
          }
        }
        if (best < 0) return null;
        slots[best] = quote;
        who[best] = author;
      }
    }

    if (slots.some((slot) => !slot)) return null;
    return slots as T[];
  };

  for (let gap = minGap; gap >= 2; gap--) {
    const spaced = place(gap);
    if (spaced) return spaced;
  }

  return [...items];
}
