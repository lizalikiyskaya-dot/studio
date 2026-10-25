export type RankStep = { min: number; title: string };

export type StarEarn = { id: string; points: number };

export type StarBeat = {
  ids: string[];
  from: number;
  to: number;
  levelUp: boolean;
  rankBefore: string;
  rankAfter: string;
};

export function rankAt(total: number, ranks: readonly RankStep[]): RankStep {
  let current = ranks[0];
  for (const rank of ranks) {
    if (total >= rank.min) current = rank;
  }
  return current;
}

/**
 * Непросмотренные начисления по порядку журнала.
 * Пока статус не меняется, несколько строк склеиваются в один полёт.
 * Строка, которая открывает новый статус, заканчивает свой полёт.
 * Пороги приходят снаружи: и 6 ступеней, и 12.
 */
export function unseenStarBeats(
  earns: readonly StarEarn[],
  seen: ReadonlySet<string>,
  earned: number,
  ranks: readonly RankStep[],
): StarBeat[] {
  if (ranks.length === 0) return [];
  const unseen = earns.filter((row) => row.points > 0 && !seen.has(row.id));
  if (unseen.length === 0) return [];

  const unseenSum = unseen.reduce((sum, row) => sum + row.points, 0);
  let cursor = Math.max(0, earned - unseenSum);
  const beats: StarBeat[] = [];
  let batch: StarEarn[] = [];
  let batchFrom = cursor;

  for (const row of unseen) {
    if (batch.length === 0) batchFrom = cursor;
    batch.push(row);
    const next = cursor + row.points;
    const before = rankAt(cursor, ranks).title;
    const after = rankAt(next, ranks).title;
    cursor = next;
    if (before !== after) {
      beats.push({
        ids: batch.map((item) => item.id),
        from: batchFrom,
        to: next,
        levelUp: true,
        rankBefore: before,
        rankAfter: after,
      });
      batch = [];
    }
  }

  if (batch.length > 0) {
    beats.push({
      ids: batch.map((item) => item.id),
      from: batchFrom,
      to: cursor,
      levelUp: false,
      rankBefore: rankAt(batchFrom, ranks).title,
      rankAfter: rankAt(cursor, ranks).title,
    });
  }

  return beats;
}
