export function pathnameOf(url: string) {
  const query = url.indexOf("?");
  return query === -1 ? url : url.slice(0, query);
}

/** Один и тот же раздел в кабинете ученика и в просмотре наставника. */
export function cabinetSection(url: string) {
  const path = pathnameOf(url);
  const student = /^\/student-view\/[^/]+(\/.*)?$/.exec(path);
  if (student) return student[1] || "/";
  const dash = /^\/dashboard(\/.*)?$/.exec(path);
  if (dash) return dash[1] || "/";
  return path;
}

export function anchorOnPage(anchorUrl: string, pathname: string) {
  if (!anchorUrl) return false;
  return cabinetSection(anchorUrl) === cabinetSection(pathname);
}

/** Ссылка заметки в том кабинете, где её открывают: ученик не уходит в student-view. */
export function urlForViewer(anchorUrl: string, currentPath: string) {
  const section = cabinetSection(anchorUrl);
  const queryAt = anchorUrl.indexOf("?");
  const query = queryAt === -1 ? "" : anchorUrl.slice(queryAt);
  if (currentPath.startsWith("/student-view/")) {
    const id = currentPath.split("/")[2] ?? "";
    return `/student-view/${id}${section}${query}`;
  }
  if (currentPath.startsWith("/dashboard")) return `/dashboard${section}${query}`;
  return pathnameOf(anchorUrl) + query;
}

export function quoteSpan(value: string, quote: string): { start: number; end: number } | null {
  return locateQuote(value, quote, null);
}

const ELLIPSIS = "…";

/** Варианты цитаты: как сохранена, без хвостового многоточия, и с «ссылка» вместо адреса. */
export function quoteNeedles(quote: string) {
  const needle = quote.trim();
  const list: string[] = [];
  function add(value: string) {
    const text = value.trim();
    if (text.length < 2 || list.includes(text)) return;
    list.push(text);
  }
  add(needle);
  if (needle.endsWith(ELLIPSIS)) add(needle.slice(0, -1));
  for (const item of [...list]) add(item.replace(/https?:\/\/[^\s]+/g, "ссылка"));
  return list;
}

/** Цитата в тексте. Если смещение известно, берётся вхождение рядом с ним, а не первое на странице. */
export function locateQuote(value: string, quote: string, offset: number | null): { start: number; end: number } | null {
  const needles = quoteNeedles(quote);
  if (!needles.length) return null;
  if (offset != null && offset >= 0) {
    for (const needle of needles) {
      if (value.startsWith(needle, offset)) return { start: offset, end: offset + needle.length };
    }
    let best: { start: number; end: number } | null = null;
    let bestDist = Infinity;
    for (const needle of needles) {
      let from = 0;
      while (from < value.length) {
        const at = value.indexOf(needle, from);
        if (at < 0) break;
        const dist = Math.abs(at - offset);
        if (dist < bestDist) {
          bestDist = dist;
          best = { start: at, end: at + needle.length };
        }
        from = at + 1;
      }
    }
    if (best) return best;
  }
  for (const needle of needles) {
    const at = value.indexOf(needle);
    if (at >= 0) return { start: at, end: at + needle.length };
  }
  return null;
}

/** Кусок выделения, который можно сохранить: без чужого многоточия, не короче двух знаков. */
export function anchorQuote(text: string, start: number): { quote: string; offset: number } | null {
  if (!Number.isInteger(start) || start < 0) return null;
  const lead = text.length - text.trimStart().length;
  const quote = text.trim().slice(0, 280);
  if (quote.length < 2) return null;
  return { quote, offset: start + lead };
}

export type TextEdit = { start: number; endBefore: number; endAfter: number };

export function textEdit(before: string, after: string): TextEdit {
  let start = 0;
  const max = Math.min(before.length, after.length);
  while (start < max && before[start] === after[start]) start++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  return { start, endBefore, endAfter };
}

/** Куда переезжает диапазон, если кусок текста заменили. Пустой результат — цитату стёрли. */
export function mapRangeThroughEdit(edit: TextEdit, start: number, end: number): { start: number; end: number } | null {
  if (end <= start) return null;
  const delta = edit.endAfter - edit.endBefore;
  if (end <= edit.start) return { start, end };
  if (start >= edit.endBefore) return { start: start + delta, end: end + delta };
  const nextStart = Math.min(start, edit.start);
  const nextEnd = Math.max(end, edit.endBefore) + delta;
  if (nextEnd - nextStart < 2) return null;
  return { start: nextStart, end: nextEnd };
}

export function shiftAnchor(before: string, after: string, quote: string, offset: number | null) {
  if (before === after) return null;
  const span = locateQuote(before, quote, offset);
  if (!span) return null;
  const mapped = mapRangeThroughEdit(textEdit(before, after), span.start, span.end);
  if (!mapped) return null;
  const nextQuote = after.slice(mapped.start, mapped.end);
  if (nextQuote.trim().length < 2) return null;
  if (nextQuote === quote && mapped.start === offset) return null;
  return { quote: nextQuote, offset: mapped.start };
}

export type CoverHit = { start: number; end: number; id: string; flash: boolean };

/** Соседние и пересекающиеся подсветки режутся на куски. В пересечении остаётся более короткая заметка. */
export function coverSegments(hits: CoverHit[]) {
  const points = new Set<number>();
  for (const hit of hits) {
    points.add(hit.start);
    points.add(hit.end);
  }
  const cuts = [...points].sort((a, b) => a - b);
  const segments: { start: number; end: number; id: string; flash: boolean }[] = [];
  for (let index = 0; index < cuts.length - 1; index++) {
    const start = cuts[index];
    const end = cuts[index + 1];
    const covering = hits.filter((hit) => hit.start <= start && hit.end >= end);
    if (!covering.length) continue;
    covering.sort((a, b) => a.end - a.start - (b.end - b.start) || a.start - b.start);
    segments.push({
      start,
      end,
      id: covering[0].id,
      flash: covering.some((hit) => hit.flash),
    });
  }
  return segments;
}

export type TextChunk = { start: number; end: number };

/** Границы цитаты внутри склейки текстовых узлов. */
export function mapSpan(chunks: TextChunk[], start: number, end: number) {
  if (end <= start) return null;
  const startChunk = chunks.find((chunk) => start >= chunk.start && start < chunk.end);
  const endChunk = chunks.find((chunk) => end - 1 >= chunk.start && end - 1 < chunk.end);
  if (!startChunk || !endChunk) return null;
  return {
    startOffset: start - startChunk.start,
    endOffset: end - endChunk.start,
    startChunk,
    endChunk,
  };
}
