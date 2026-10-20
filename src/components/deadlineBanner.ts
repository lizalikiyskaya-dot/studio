/** Сколько ближайших дедлайнов рисуем в плашке, прежде чем свернуть хвост. */
export const DEADLINE_BANNER_LIMIT = 5;

export function deadlineMoreLabel(count: number): string {
  const n = Math.max(0, Math.trunc(count));
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "задание"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? "задания"
        : "заданий";
  return `ещё ${n} ${word}`;
}
