"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { freshSnap, trackSources, type Placement } from "./anchorTrack";
import { caretRect, collectVisibleText, visibleFields, type TextChunk } from "./pageText";
import { anchorOnPage, locateQuote, mapSpan, coverSegments } from "./quoteMatch";

export type MarkNote = {
  id: string;
  resolved: boolean;
  anchorQuote: string;
  anchorUrl: string;
  anchorOffset: number | null;
};

const LAYER_ID = "note-mark-layer";

type Chunk = TextChunk;

function rangeFor(chunks: Chunk[], start: number, end: number) {
  const mapped = mapSpan(chunks, start, end);
  if (!mapped) return null;
  const startChunk = chunks.find((chunk) => chunk.start === mapped.startChunk.start && chunk.end === mapped.startChunk.end);
  const endChunk = chunks.find((chunk) => chunk.start === mapped.endChunk.start && chunk.end === mapped.endChunk.end);
  if (!startChunk || !endChunk) return null;
  const range = document.createRange();
  range.setStart(startChunk.node, mapped.startOffset);
  range.setEnd(endChunk.node, mapped.endOffset);
  return range;
}

function paintDom(chunks: Chunk[], placements: Placement[], flashId: string | null) {
  const HighlightCtor = window.Highlight;
  const hits: { id: string; range: Range }[] = [];
  if (!("highlights" in CSS) || typeof HighlightCtor !== "function") {
    CSS.highlights?.delete("note-anchor");
    CSS.highlights?.delete("note-flash");
    return hits;
  }
  const ranges: Range[] = [];
  const flashes: Range[] = [];
  for (const place of placements) {
    if (place.key !== "dom") continue;
    const range = rangeFor(chunks, place.start, place.end);
    if (!range) continue;
    ranges.push(range);
    hits.push({ id: place.id, range });
    if (place.id === flashId) flashes.push(range);
  }
  CSS.highlights.set("note-anchor", new HighlightCtor(...ranges));
  CSS.highlights.set("note-flash", new HighlightCtor(...flashes));
  return hits;
}

function fieldOverlay(
  field: HTMLInputElement | HTMLTextAreaElement,
  segments: { start: number; end: number; id: string; flash: boolean }[],
) {
  if (!segments.length) return null;
  const style = getComputedStyle(field);
  const rect = field.getBoundingClientRect();
  const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
  const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
  const box = document.createElement("div");
  box.className = "note-field-overlay";
  box.style.left = `${rect.left + borderLeft}px`;
  box.style.top = `${rect.top + borderTop}px`;
  box.style.width = `${field.clientWidth}px`;
  box.style.height = `${field.clientHeight}px`;
  box.style.boxSizing = "border-box";
  box.style.padding = style.padding;

  const inner = document.createElement("div");
  inner.style.boxSizing = "border-box";
  inner.style.width = "100%";
  inner.style.margin = "0";
  inner.style.border = "0";
  inner.style.fontFamily = style.fontFamily;
  inner.style.fontSize = style.fontSize;
  inner.style.fontWeight = style.fontWeight;
  inner.style.fontStyle = style.fontStyle;
  inner.style.lineHeight = style.lineHeight;
  inner.style.letterSpacing = style.letterSpacing;
  inner.style.wordSpacing = style.wordSpacing;
  inner.style.textAlign = style.textAlign;
  inner.style.whiteSpace = field instanceof HTMLInputElement ? "pre" : "pre-wrap";
  inner.style.overflowWrap = style.overflowWrap;
  inner.style.wordBreak = style.wordBreak;
  inner.style.color = "transparent";
  if (field instanceof HTMLInputElement) {
    inner.style.display = "flex";
    inner.style.alignItems = "center";
    inner.style.height = "100%";
    inner.style.transform = `translate(${-field.scrollLeft}px, 0)`;
  } else {
    inner.style.transform = `translate(${-field.scrollLeft}px, ${-field.scrollTop}px)`;
  }

  let cursor = 0;
  const value = field.value;
  for (const segment of segments) {
    if (segment.start > cursor) inner.append(value.slice(cursor, segment.start));
    const mark = document.createElement("mark");
    mark.dataset.noteId = segment.id;
    if (segment.flash) mark.className = "is-flash";
    mark.textContent = value.slice(segment.start, segment.end);
    inner.append(mark);
    cursor = segment.end;
  }
  if (cursor < value.length) inner.append(value.slice(cursor));
  box.append(inner);
  return box;
}

function paintFields(
  fields: (HTMLInputElement | HTMLTextAreaElement)[],
  keys: WeakMap<Element, string>,
  placements: Placement[],
  flashId: string | null,
) {
  let layer = document.getElementById(LAYER_ID);
  if (!layer) {
    layer = document.createElement("div");
    layer.id = LAYER_ID;
    document.body.appendChild(layer);
  }
  layer.replaceChildren();
  for (const field of fields) {
    const key = keys.get(field);
    const hits = placements.flatMap((place) => {
      if (place.key !== key) return [];
      return [{ start: place.start, end: place.end, id: place.id, flash: place.id === flashId }];
    });
    const overlay = fieldOverlay(field, coverSegments(hits));
    if (overlay) layer.append(overlay);
  }
}

function needsReveal(el: Element) {
  if (el.closest(".collapse-slot:not(.is-open), .chapter-note-clamp, .task-note-clamp")) return true;
  let node: Element | null = el;
  while (node && node !== document.body) {
    if (getComputedStyle(node).display === "none") return true;
    node = node.parentElement;
  }
  return false;
}

function reveal(el: Element) {
  let guard = 0;
  let current: Element | null = el;
  while (current && guard < 6) {
    const closed: Element | null = current.closest(".collapse-slot:not(.is-open)");
    if (!closed) break;
    const header = closed.previousElementSibling;
    if (header instanceof HTMLElement) header.click();
    current = closed.parentElement;
    guard += 1;
  }
  let hidden: Element | null = el;
  guard = 0;
  while (hidden && guard < 8) {
    if (hidden instanceof HTMLElement && getComputedStyle(hidden).display === "none" && hidden.parentElement) {
      const kids = [...hidden.parentElement.children];
      const index = kids.indexOf(hidden);
      const button = hidden.parentElement.querySelectorAll(":scope > :first-child button")[index - 1];
      if (button instanceof HTMLElement) button.click();
    }
    hidden = hidden.parentElement;
    guard += 1;
  }
  const clamp = el.closest(".chapter-note-clamp, .task-note-clamp");
  const more = clamp?.parentElement?.querySelector("button");
  if (more instanceof HTMLElement) more.click();
}

function clearMarks() {
  CSS.highlights?.delete("note-anchor");
  CSS.highlights?.delete("note-flash");
  document.getElementById(LAYER_ID)?.replaceChildren();
}

export default function NoteMarks({ notes, flashId }: { notes: MarkNote[]; flashId: string | null }) {
  const pathname = usePathname();
  const flashRef = useRef(flashId);
  flashRef.current = flashId;
  const scrolled = useRef<string | null>(null);
  const revealed = useRef<string | null>(null);
  const drift = useRef(freshSnap());
  const fieldKeys = useRef(new WeakMap<Element, string>());
  const keySeq = useRef(0);
  const domHits = useRef<{ id: string; range: Range }[]>([]);

  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-note-highlight", "");
    style.textContent = "::highlight(note-anchor){background-color:rgba(255,212,59,0.55)}::highlight(note-flash){background-color:rgba(255,196,40,0.95)}";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    scrolled.current = null;
    revealed.current = null;
    drift.current = freshSnap();
  }, [pathname]);

  useEffect(() => {
    scrolled.current = null;
    revealed.current = null;
  }, [flashId]);

  useEffect(() => {
    const root = document.querySelector(".studio-content");
    if (!root) return;
    let timer = 0;
    let alive = true;

    function keyFor(field: Element) {
      let key = fieldKeys.current.get(field);
      if (!key) {
        keySeq.current += 1;
        key = `f${keySeq.current}`;
        fieldKeys.current.set(field, key);
      }
      return key;
    }

    function paint() {
      if (!alive) return;
      const flash = flashRef.current;
      const pageNotes = notes.filter((note) => anchorOnPage(note.anchorUrl, pathname));
      const open = pageNotes.filter((note) => !note.resolved);
      const fields = visibleFields(root!);
      const dom = collectVisibleText(root!);
      const sources = [
        ...fields.map((field) => ({ key: keyFor(field), text: field.value })),
        { key: "dom", text: dom.text },
      ];
      const tracked = trackSources(drift.current, sources, open);
      if (tracked.updates.length) {
        const detail = tracked.updates;
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("studio:notes-shift", { detail }));
        }, 0);
      }
      domHits.current = paintDom(dom.chunks, tracked.placements, flash);
      paintFields(fields, fieldKeys.current, tracked.placements, flash);

      if (!flash || scrolled.current === flash) return;
      const target = pageNotes.find((note) => note.id === flash);
      if (!target) return;
      const place = tracked.placements.find((item) => item.id === flash) ?? placedFallback(sources, target);
      const host = !place
        ? null
        : place.key === "dom"
          ? rangeFor(dom.chunks, place.start, place.end)?.startContainer.parentElement ?? null
          : fields.find((field) => keyFor(field) === place.key) ?? null;
      const targetHost = host ?? hiddenField(root!, target);
      if (!targetHost) return;
      if (revealed.current !== flash && needsReveal(targetHost)) {
        revealed.current = flash;
        reveal(targetHost);
        return;
      }
      if (target.resolved) {
        targetHost.scrollIntoView({ block: "center", behavior: "auto" });
        scrolled.current = flash;
        return;
      }
      if (!place || !host) return;
      if (place.key === "dom") {
        const range = rangeFor(dom.chunks, place.start, place.end);
        const rect = range?.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) return;
        window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - window.innerHeight / 3) });
      } else if (host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement) {
        const rect = caretRect(host, place.start);
        window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - window.innerHeight / 3) });
      }
      scrolled.current = flash;
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(paint, 40);
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-notes-ui], [data-annotate-btn]")) return;
      const mark = target.closest(`#${LAYER_ID} mark`);
      let id = mark instanceof HTMLElement ? mark.dataset.noteId ?? "" : "";
      if (!id) {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) return;
        id = noteAtPoint(event.clientX, event.clientY);
      }
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent("studio:focus-note", { detail: id }));
    }

    paint();
    const observer = new MutationObserver((records) => {
      const inside = records.every((record) => {
        const el = record.target instanceof Element ? record.target : record.target.parentElement;
        return !!el?.closest(`#${LAYER_ID}`);
      });
      if (!inside) schedule();
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "open"],
    });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    root.addEventListener("input", schedule, true);
    document.addEventListener("click", onClick, true);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      root.removeEventListener("input", schedule, true);
      document.removeEventListener("click", onClick, true);
      domHits.current = [];
      clearMarks();
    };
  }, [notes, pathname, flashId]);

  function noteAtPoint(x: number, y: number) {
    const pos = document.caretPositionFromPoint?.(x, y);
    const range = pos?.offsetNode ? null : document.caretRangeFromPoint?.(x, y);
    const node = pos?.offsetNode ?? range?.startContainer ?? null;
    const offset = pos?.offsetNode ? pos.offset : range?.startOffset ?? 0;
    if (!node) return "";
    let best = "";
    let bestSize = Infinity;
    for (const hit of domHits.current) {
      try {
        if (!hit.range.isPointInRange(node, offset)) continue;
      } catch {
        continue;
      }
      const size = hit.range.toString().length;
      if (size < bestSize) {
        bestSize = size;
        best = hit.id;
      }
    }
    return best;
  }

  return null;
}

function hiddenField(root: Element, note: MarkNote) {
  for (const node of root.querySelectorAll("textarea, input")) {
    if (!(node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement)) continue;
    if (node.closest("[data-notes-ui]")) continue;
    if (!locateQuote(node.value, note.anchorQuote, note.anchorOffset)) continue;
    return node;
  }
  return null;
}

function placedFallback(
  sources: { key: string; text: string }[],
  note: MarkNote,
): Placement | null {
  for (const source of sources) {
    const span = locateQuote(source.text, note.anchorQuote, note.anchorOffset);
    if (!span) continue;
    return { id: note.id, key: source.key, start: span.start, end: span.end };
  }
  return null;
}
