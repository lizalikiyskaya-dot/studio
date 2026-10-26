import { locateQuote, shiftAnchor } from "./quoteMatch";

export type Anchored = {
  id: string;
  anchorQuote: string;
  anchorOffset: number | null;
};

export type AnchorUpdate = { id: string; quote: string; offset: number };

export type Placement = { id: string; key: string; start: number; end: number };

export type SourceSnap = {
  snaps: Map<string, string>;
  claims: Map<string, string>;
  overrides: Map<string, { quote: string; offset: number }>;
};

export function freshSnap(): SourceSnap {
  return { snaps: new Map(), claims: new Map(), overrides: new Map() };
}

function remember(state: SourceSnap, updates: Map<string, AnchorUpdate>, note: Anchored, quote: string, offset: number) {
  if (note.anchorQuote === quote && note.anchorOffset === offset) return;
  note.anchorQuote = quote;
  note.anchorOffset = offset;
  const next = { id: note.id, quote, offset };
  updates.set(note.id, next);
  state.overrides.set(note.id, { quote, offset });
}

/**
 * Следит за текстами страницы. Вставка перед цитатой двигает смещение,
 * правка внутри цитаты меняет саму цитату. Повторный проход того же текста молчит.
 */
export function trackSources(
  state: SourceSnap,
  sources: { key: string; text: string }[],
  notes: Anchored[],
) {
  const updates = new Map<string, AnchorUpdate>();
  const live = notes.map((note) => {
    const saved = state.overrides.get(note.id);
    if (!saved) return { ...note };
    if (note.anchorQuote === saved.quote && note.anchorOffset === saved.offset) {
      state.overrides.delete(note.id);
      return { ...note };
    }
    return { ...note, anchorQuote: saved.quote, anchorOffset: saved.offset };
  });

  for (const source of sources) {
    const before = state.snaps.get(source.key);
    state.snaps.set(source.key, source.text);
    if (before == null || before === source.text) continue;
    for (const note of live) {
      if (state.claims.get(note.id) !== source.key) continue;
      const next = shiftAnchor(before, source.text, note.anchorQuote, note.anchorOffset);
      if (!next) continue;
      remember(state, updates, note, next.quote, next.offset);
    }
  }

  const choices = new Map<string, { key: string; start: number; end: number; exact: boolean }[]>();
  for (const note of live) {
    const found: { key: string; start: number; end: number; exact: boolean }[] = [];
    for (const source of sources) {
      const span = locateQuote(source.text, note.anchorQuote, note.anchorOffset);
      if (!span) continue;
      const exact = note.anchorOffset != null
        && span.start === note.anchorOffset
        && source.text.slice(span.start, span.end) === note.anchorQuote;
      found.push({ key: source.key, start: span.start, end: span.end, exact });
    }
    found.sort((a, b) => Number(b.exact) - Number(a.exact));
    choices.set(note.id, found);
  }

  const placements: Placement[] = [];
  const seen = new Set<string>();
  const taken = new Set<string>();
  const assigned = new Map<string, { key: string; start: number; end: number }>();
  const slotOf = (quote: string, choice: { key: string; start: number }) => `${choice.key}\n${quote}\n${choice.start}`;

  function take(note: Anchored, choice: { key: string; start: number; end: number }) {
    assigned.set(note.id, choice);
    taken.add(slotOf(note.anchorQuote, choice));
  }

  for (const note of live) {
    const exact = (choices.get(note.id) ?? []).filter((choice) => choice.exact && !taken.has(slotOf(note.anchorQuote, choice)));
    if (exact.length === 1) take(note, exact[0]);
  }
  for (const note of live) {
    if (assigned.has(note.id)) continue;
    const options = choices.get(note.id) ?? [];
    const free = options.find((choice) => choice.exact && !taken.has(slotOf(note.anchorQuote, choice)))
      ?? options.find((choice) => !taken.has(slotOf(note.anchorQuote, choice)))
      ?? options[0];
    if (free) take(note, free);
  }

  for (const note of live) {
    const chosen = assigned.get(note.id);
    if (!chosen) {
      state.claims.delete(note.id);
      continue;
    }
    state.claims.set(note.id, chosen.key);
    seen.add(note.id);
    const source = sources.find((item) => item.key === chosen.key);
    const slice = source?.text.slice(chosen.start, chosen.end) ?? "";
    // Смещение пишем один раз, пока его нет. Чужой текст страницы не затирает смещение поля.
    if (note.anchorOffset == null && slice === note.anchorQuote) {
      remember(state, updates, note, note.anchorQuote, chosen.start);
    }
    placements.push({ id: note.id, key: chosen.key, start: chosen.start, end: chosen.end });
  }
  for (const id of state.claims.keys()) {
    if (!seen.has(id)) state.claims.delete(id);
  }
  return { notes: live, updates: [...updates.values()], placements };
}
