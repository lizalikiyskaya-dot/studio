const TEXTUAL = new Set(["", "text", "search", "url", "tel", "email", "number"]);
const BLOCKS = "p, div, li, h1, h2, h3, h4, blockquote, tr, section, article, pre";

export type TextChunk = { node: Text; start: number; end: number };

function hidden(el: Element) {
  let node: Element | null = el;
  while (node && node !== document.body) {
    if (node instanceof HTMLElement && node.hidden) return true;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return true;
    node = node.parentElement;
  }
  return false;
}

function gap(prev: Text, next: Text) {
  const before = prev.parentElement?.closest(BLOCKS);
  const after = next.parentElement?.closest(BLOCKS);
  if (before && after && before !== after) return "\n";
  try {
    const range = document.createRange();
    range.setStartAfter(prev);
    range.setEndBefore(next);
    if (range.cloneContents().querySelector("br")) return "\n";
  } catch {
    return "";
  }
  return "";
}

/** Видимый текст страницы без полей ввода. Между абзацами ставится перевод строки, как в выделении. */
export function collectVisibleText(root: Element, scope: "page" | "writing" = "page") {
  const chunks: TextChunk[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest("#note-mark-layer, [data-notes-ui], script, style, textarea, input, select, noscript")) {
        return NodeFilter.FILTER_REJECT;
      }
      // Подпись сохранения и кнопки не входят в текст: иначе правка рядом с цитатой раздувает якорь.
      if (parent.closest(".writing-toolbar, .writing-card-bar, .writing-mode-top, .writing-mode-hint")) {
        return NodeFilter.FILTER_REJECT;
      }
      if (scope === "page" && parent.closest(".writing-prose")) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[aria-hidden='true'], [inert], .collapse-slot:not(.is-open)")) return NodeFilter.FILTER_REJECT;
      const review = parent.closest("[data-review-field]");
      if (parent.closest(".suggest-doc") && review?.querySelector("textarea, input")) return NodeFilter.FILTER_REJECT;
      if (hidden(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let text = "";
  let prev: Text | null = null;
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const node = current as Text;
    if (!node.data) continue;
    if (prev) text += gap(prev, node);
    chunks.push({ node, start: text.length, end: text.length + node.data.length });
    text += node.data;
    prev = node;
  }
  return { text, chunks };
}

function joinRoots(roots: Element[], scope: "page" | "writing") {
  const chunks: TextChunk[] = [];
  let text = "";
  for (const root of roots) {
    const part = collectVisibleText(root, scope);
    if (!part.text) continue;
    if (text) text += "\n";
    const shift = text.length;
    text += part.text;
    for (const chunk of part.chunks) {
      chunks.push({ node: chunk.node, start: chunk.start + shift, end: chunk.end + shift });
    }
  }
  return { text, chunks };
}

/** Текст карточек. Поле «Режима письма» собирается отдельно и не прыгает по странице. */
export function collectPageText() {
  if (typeof document === "undefined") return { text: "", chunks: [] as TextChunk[] };
  const studio = document.querySelector(".studio-content");
  if (!studio) return { text: "", chunks: [] as TextChunk[] };
  return joinRoots([studio], "page");
}

/** Только текст редактора: и в карточке, и в открытом окне письма. */
export function collectWritingText() {
  if (typeof document === "undefined") return { text: "", chunks: [] as TextChunk[] };
  return joinRoots([...document.querySelectorAll(".writing-prose")], "writing");
}

export function offsetInCollected(collected: { chunks: TextChunk[] }, node: Node | null, offset: number) {
  const target = node?.nodeType === Node.TEXT_NODE ? (node as Text) : null;
  if (!target) return null;
  const chunk = collected.chunks.find((item) => item.node === target);
  if (!chunk) return null;
  return chunk.start + Math.min(Math.max(offset, 0), target.data.length);
}

export function visibleFields(root: Element) {
  const fields: (HTMLInputElement | HTMLTextAreaElement)[] = [];
  for (const node of root.querySelectorAll("textarea, input")) {
    if (!(node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement)) continue;
    if (node.closest("[data-notes-ui]")) continue;
    if (node instanceof HTMLInputElement && !TEXTUAL.has((node.type || "text").toLowerCase())) continue;
    if (node.closest("[inert], .collapse-slot:not(.is-open)")) continue;
    if (hidden(node)) continue;
    if (node.clientWidth < 2 || node.clientHeight < 2) continue;
    fields.push(node);
  }
  return fields;
}

export function caretRect(field: HTMLTextAreaElement | HTMLInputElement, index: number) {
  const fieldRect = field.getBoundingClientRect();
  if (field instanceof HTMLInputElement || field.clientWidth < 8) {
    return new DOMRect(fieldRect.left + 8, fieldRect.top + fieldRect.height / 2, 0, 0);
  }
  const mirror = document.createElement("div");
  const style = getComputedStyle(field);
  mirror.style.position = "fixed";
  mirror.style.left = "0";
  mirror.style.top = "0";
  mirror.style.visibility = "hidden";
  mirror.style.pointerEvents = "none";
  mirror.style.boxSizing = "border-box";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = style.overflowWrap;
  mirror.style.wordBreak = style.wordBreak;
  mirror.style.width = `${field.clientWidth}px`;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.fontStyle = style.fontStyle;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.padding = style.padding;
  mirror.textContent = field.value.slice(0, index);
  const mark = document.createElement("span");
  mark.textContent = field.value.slice(index, index + 1) || ".";
  mirror.appendChild(mark);
  document.body.appendChild(mirror);
  const markRect = mark.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  mirror.remove();
  const top = fieldRect.top + (markRect.top - mirrorRect.top) - field.scrollTop;
  const left = fieldRect.left + (markRect.left - mirrorRect.left) - field.scrollLeft;
  return new DOMRect(left, top, markRect.width, markRect.height || 18);
}
