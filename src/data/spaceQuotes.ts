/**
 * Очередь цитаты дня. Один и тот же автор не встаёт ближе чем через minGap строк,
 * и на стыке конца списка с началом тоже. Порядок внутри автора сохраняется.
 * Авторы с большим числом строк встают первыми, равным шагом: с самого большого шага
 * и с самой ранней свободной позиции. Если этот шаг занят, перебор возвращается
 * к предыдущему автору. Для одного и того же списка результат один и тот же.
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

  const distance = (from: number, to: number) => {
    const delta = Math.abs(from - to);
    return Math.min(delta, count - delta);
  };

  const place = (gap: number): T[] | null => {
    const occupied = Array(count).fill(false);
    const slots: Array<T | undefined> = Array(count);
    let nodes = 0;

    const search = (authorIndex: number): boolean => {
      if (authorIndex === authors.length) return true;
      if (nodes > 5_000_000) return false;
      const quotes = groups.get(authors[authorIndex])!;
      const need = quotes.length;
      for (let step = Math.floor(count / need); step >= gap; step--) {
        for (let start = 0; start < count; start++) {
          nodes += 1;
          if (nodes > 5_000_000) return false;
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

  for (let gap = minGap; gap >= 2; gap--) {
    const spaced = place(gap);
    if (spaced) return spaced;
  }

  return [...items];
}
