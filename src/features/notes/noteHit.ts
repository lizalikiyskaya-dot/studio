export type HitBox = { left: number; top: number; right: number; bottom: number };

/** Какая подсветка под курсором. В пересечении берётся меньший прямоугольник. */
export function idAtBoxes(
  hits: { id: string; boxes: HitBox[] }[],
  x: number,
  y: number,
  pad = 2,
) {
  let best = "";
  let bestArea = Infinity;
  for (const hit of hits) {
    if (!hit.id) continue;
    for (const box of hit.boxes) {
      if (x < box.left - pad || x > box.right + pad || y < box.top - pad || y > box.bottom + pad) continue;
      const area = Math.max(1, box.right - box.left) * Math.max(1, box.bottom - box.top);
      if (area < bestArea) {
        bestArea = area;
        best = hit.id;
      }
    }
  }
  return best;
}

/** Какая цитата содержит смещение. На границе и в пересечении остаётся более короткая. */
export function idAtOffset(spans: { id: string; start: number; end: number }[], offset: number) {
  let best = "";
  let bestLen = Infinity;
  for (const span of spans) {
    if (!span.id || span.end <= span.start) continue;
    const inside = offset >= span.start && offset < span.end;
    const edge = offset === span.end;
    if (!inside && !edge) continue;
    const len = span.end - span.start;
    if (len < bestLen) {
      bestLen = len;
      best = span.id;
    }
  }
  return best;
}
