"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { anchorOnPage, mapSpan, quoteSpan } from "./quoteMatch";

export type MarkNote = {
  id: string;
  resolved: boolean;
  anchorQuote: string;
  anchorUrl: string;
};

const LAYER_ID = "note-mark-layer";
const TEXTUAL = new Set(["", "text", "search", "url", "tel", "email", "number"]);

type Chunk = { node: Text; start: number; end: number };

function collectText(root: Element) {
  const chunks: Chunk[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(`#${LAYER_ID}, [data-notes-ui], script, style, textarea, input`)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[aria-hidden='true']")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let text = "";
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const data = (current as Text).data;
    if (!data) continue;
    chunks.push({ node: current as Text, start: text.length, end: text.length + data.length });
    text += data;
  }
  return { text, chunks };
}

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

function paintDom(notes: MarkNote[], flashId: string | null) {
  const root = document.querySelector(".studio-content");
  const HighlightCtor = window.Highlight;
  if (!root || !("highlights" in CSS) || typeof HighlightCtor !== "function") {
    CSS.highlights?.delete("note-anchor");
    CSS.highlights?.delete("note-flash");
    return;
  }
  const full = collectText(root);
  const ranges: Range[] = [];
  const flashes: Range[] = [];
  for (const note of notes) {
    const span = quoteSpan(full.text, note.anchorQuote);
    if (!span) continue;
    const range = rangeFor(full.chunks, span.start, span.end);
    if (!range) continue;
    ranges.push(range);
    if (note.id === flashId) flashes.push(range);
  }
  CSS.highlights.set("note-anchor", new HighlightCtor(...ranges));
  CSS.highlights.set("note-flash", new HighlightCtor(...flashes));
}

function fieldOverlay(field: HTMLInputElement | HTMLTextAreaElement, notes: MarkNote[], flashId: string | null) {
  const hits = notes.flatMap((note) => {
    const span = quoteSpan(field.value, note.anchorQuote);
    return span ? [{ ...span, flash: note.id === flashId }] : [];
  }).sort((a, b) => a.start - b.start || b.end - a.end);
  const used: typeof hits = [];
  for (const hit of hits) {
    if (used.some((item) => hit.start < item.end && hit.end > item.start)) continue;
    used.push(hit);
  }
  used.sort((a, b) => a.start - b.start);
  if (used.length === 0) return null;

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

  const inner = document.createElement("div");
  inner.style.transform = `translate(${-field.scrollLeft}px, ${-field.scrollTop}px)`;
  inner.style.width = `${field.clientWidth}px`;
  inner.style.font = style.font;
  inner.style.lineHeight = style.lineHeight;
  inner.style.letterSpacing = style.letterSpacing;
  inner.style.padding = style.padding;
  inner.style.whiteSpace = field instanceof HTMLInputElement ? "pre" : "pre-wrap";
  inner.style.overflowWrap = style.overflowWrap;
  inner.style.wordBreak = style.wordBreak;
  inner.style.color = "transparent";

  let cursor = 0;
  for (const hit of used) {
    if (hit.start > cursor) inner.append(field.value.slice(cursor, hit.start));
    const mark = document.createElement("mark");
    mark.className = hit.flash ? "is-flash" : "";
    mark.textContent = field.value.slice(hit.start, hit.end);
    inner.append(mark);
    cursor = hit.end;
  }
  if (cursor < field.value.length) inner.append(field.value.slice(cursor));
  box.append(inner);
  return box;
}

function paintFields(notes: MarkNote[], flashId: string | null) {
  let layer = document.getElementById(LAYER_ID);
  if (!layer) {
    layer = document.createElement("div");
    layer.id = LAYER_ID;
    document.body.appendChild(layer);
  }
  layer.replaceChildren();
  const root = document.querySelector(".studio-content");
  if (!root) return;
  for (const node of root.querySelectorAll("textarea, input")) {
    if (!(node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement)) continue;
    if (node.closest("[data-notes-ui]")) continue;
    if (node instanceof HTMLInputElement && !TEXTUAL.has((node.type || "text").toLowerCase())) continue;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const overlay = fieldOverlay(node, notes, flashId);
    if (overlay) layer.append(overlay);
  }
}

function scrollToQuote(quote: string) {
  const root = document.querySelector(".studio-content");
  if (!root) return false;
  const full = collectText(root);
  const span = quoteSpan(full.text, quote);
  if (span) {
    const range = rangeFor(full.chunks, span.start, span.end);
    const rect = range?.getBoundingClientRect();
    if (range && rect && (rect.width > 0 || rect.height > 0)) {
      range.startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "auto" });
      return true;
    }
  }
  for (const node of root.querySelectorAll("textarea, input")) {
    if (!(node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement)) continue;
    if (!quoteSpan(node.value, quote)) continue;
    node.scrollIntoView({ block: "center", behavior: "auto" });
    return true;
  }
  return false;
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

  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-note-highlight", "");
    style.textContent = "::highlight(note-anchor){background-color:rgba(255,212,59,0.55)}::highlight(note-flash){background-color:rgba(255,196,40,0.95)}";
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    scrolled.current = null;
  }, [flashId, pathname]);

  useEffect(() => {
    const open = notes.filter((note) => !note.resolved && anchorOnPage(note.anchorUrl, pathname));
    let timer = 0;
    let alive = true;

    function paint() {
      if (!alive) return;
      const flash = flashRef.current;
      paintDom(open, flash);
      paintFields(open, flash);
      if (flash && scrolled.current !== flash) {
        const note = open.find((item) => item.id === flash);
        if (note && scrollToQuote(note.anchorQuote)) scrolled.current = flash;
      }
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(paint, 40);
    }

    paint();
    const root = document.querySelector(".studio-content");
    const observer = new MutationObserver((records) => {
      const inside = records.every((record) => {
        const el = record.target instanceof Element ? record.target : record.target.parentElement;
        return !!el?.closest(`#${LAYER_ID}`);
      });
      if (!inside) schedule();
    });
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    root?.addEventListener("input", schedule, true);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      root?.removeEventListener("input", schedule, true);
      clearMarks();
    };
  }, [notes, pathname, flashId]);

  return null;
}
