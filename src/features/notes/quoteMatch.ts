export function pathnameOf(url: string) {
  const query = url.indexOf("?");
  return query === -1 ? url : url.slice(0, query);
}

export function anchorOnPage(anchorUrl: string, pathname: string) {
  if (!anchorUrl) return false;
  return pathnameOf(anchorUrl) === pathname;
}

export function quoteSpan(value: string, quote: string): { start: number; end: number } | null {
  const needle = quote.trim();
  if (needle.length < 2) return null;
  const at = value.indexOf(needle);
  if (at < 0) return null;
  return { start: at, end: at + needle.length };
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
