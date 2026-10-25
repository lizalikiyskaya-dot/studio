/** Доля по горизонтали и вертикали, 0–100. Подписи ходов сюда не входят: они в карточках ниже. */
export type Point = { x: number; y: number };

export function hasText(value: string | undefined): boolean {
  return !!value?.trim();
}

export function arcMoveFilled(data: Record<string, string>, key: string, sceneKey?: string): boolean {
  return hasText(data[key]) || (!!sceneKey && hasText(data[sceneKey]));
}

/** Кривая арки: в начале ниже, после середины поднимается. */
export function arcPositions(count: number): Point[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const dip = Math.sin((Math.min(t, 0.4) / 0.4) * Math.PI);
    const rise = t <= 0.4 ? 0 : (t - 0.4) / 0.6;
    const y = 62 + dip * 16 - rise * 44;
    return {
      x: count === 1 ? 50 : 8 + t * 84,
      y: Math.round(Math.max(18, Math.min(82, y)) * 10) / 10,
    };
  });
}

export function circlePositions(count: number): Point[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return {
      x: Math.round((50 + Math.cos(angle) * 36) * 10) / 10,
      y: Math.round((50 + Math.sin(angle) * 36) * 10) / 10,
    };
  });
}

export function linePath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let path = `M ${first.x} ${first.y}`;
  for (let index = 0; index < rest.length; index += 1) {
    const previous = index === 0 ? first : rest[index - 1];
    const next = rest[index];
    const mid = (previous.x + next.x) / 2;
    path += ` C ${mid} ${previous.y}, ${mid} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}
