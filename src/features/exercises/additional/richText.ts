export type ContentFormat = "plain" | "markdown";

export type TextSize = "s" | "l" | "xl";

export type Inline = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  size?: TextSize;
};

export type BlockAlign = "justify";

export type Block =
  | { kind: "p"; inlines: Inline[]; align?: BlockAlign }
  | { kind: "h2"; inlines: Inline[]; align?: BlockAlign }
  | { kind: "quote"; inlines: Inline[]; align?: BlockAlign }
  | { kind: "ul"; items: Inline[][]; align?: BlockAlign }
  | { kind: "ol"; items: Inline[][]; align?: BlockAlign };

export type CaretPoint = { block: number; offset: number };

const MARKER = /^(#{1,3} |> |- |\d+\. |::: )/;

function styled(part: Inline): boolean {
  return !!(part.bold || part.italic || part.underline || part.size);
}

function marks(part: Inline): Inline {
  return {
    text: part.text,
    ...(part.bold ? { bold: true } : {}),
    ...(part.italic ? { italic: true } : {}),
    ...(part.underline ? { underline: true } : {}),
    ...(part.size ? { size: part.size } : {}),
  };
}

function sameStyle(a: Inline, b: Inline) {
  return a.bold === b.bold && a.italic === b.italic && a.underline === b.underline && a.size === b.size;
}

function withAlign<T extends Block>(block: T, align?: BlockAlign): T {
  if (align !== "justify") return block;
  return { ...block, align };
}

function tidyMarks(parts: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const part of parts) {
    if (!styled(part)) {
      out.push(part);
      continue;
    }
    const lead = /^\s+/.exec(part.text)?.[0] ?? "";
    const trail = /\s+$/.exec(part.text)?.[0] ?? "";
    const core = part.text.slice(lead.length, part.text.length - trail.length);
    if (lead) out.push({ text: lead });
    if (core) out.push(marks({ ...part, text: core }));
    if (trail) out.push({ text: trail });
  }
  return merge(out);
}

function merge(parts: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const part of parts) {
    if (!part.text) continue;
    const prev = out[out.length - 1];
    if (prev && sameStyle(prev, part)) prev.text += part.text;
    else out.push(marks(part));
  }
  return out;
}

const SIZE_TAG: Record<string, TextSize> = { small: "s", big: "l", huge: "xl" };

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let bold = false;
  let italic = false;
  let underline = false;
  let size: TextSize | undefined;
  let buf = "";
  function flush() {
    if (!buf) return;
    out.push(marks({ text: buf, bold, italic, underline, size }));
    buf = "";
  }
  for (let i = 0; i < src.length; i++) {
    if (src[i] === "\\" && i + 1 < src.length) {
      buf += src[i + 1];
      i += 1;
      continue;
    }
    const tag = /^<(\/?)(u|small|big|huge)>/.exec(src.slice(i));
    if (tag) {
      flush();
      const close = tag[1] === "/";
      if (tag[2] === "u") underline = !close;
      else size = close ? undefined : SIZE_TAG[tag[2]];
      i += tag[0].length - 1;
      continue;
    }
    if (src.startsWith("**", i)) {
      flush();
      bold = !bold;
      i += 1;
      continue;
    }
    if (src[i] === "*") {
      flush();
      italic = !italic;
      continue;
    }
    buf += src[i];
  }
  flush();
  return merge(out);
}

function escapeInline(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\*/g, "\\*").replace(/<(?=\/?(?:u|small|big|huge)>)/g, "\\<");
}

function escapeLineStart(text: string): string {
  return MARKER.test(text) ? `\\${text}` : text;
}

function inlineText(parts: Inline[]): string {
  return parts.map((part) => part.text).join("");
}

function inlineMarkdown(parts: Inline[]): string {
  return parts
    .map((part) => {
      let text = escapeInline(part.text);
      if (!text) return "";
      if (part.bold && part.italic) text = `***${text}***`;
      else if (part.bold) text = `**${text}**`;
      else if (part.italic) text = `*${text}*`;
      if (part.underline) text = `<u>${text}</u>`;
      if (part.size === "s") text = `<small>${text}</small>`;
      if (part.size === "l") text = `<big>${text}</big>`;
      if (part.size === "xl") text = `<huge>${text}</huge>`;
      return text;
    })
    .join("");
}

/** Делит переносы внутри блока на отдельные строки, чтобы обычный текст вернулся как был. */
export function splitLines(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const block of blocks) {
    if (block.kind === "ul" || block.kind === "ol") {
      out.push({
        kind: block.kind,
        ...(block.align ? { align: block.align } : {}),
        items: block.items.map((item) => merge(item.map((part) => marks({ ...part, text: part.text.replace(/\n/g, " ") })))),
      });
      continue;
    }
    const lines: Inline[][] = [[]];
    for (const part of block.inlines) {
      const bits = part.text.split("\n");
      bits.forEach((bit, index) => {
        if (index > 0) lines.push([]);
        if (bit) lines[lines.length - 1].push(marks({ ...part, text: bit }));
      });
    }
    for (const line of lines) {
      out.push(withAlign({ kind: block.kind, inlines: tidyMarks(merge(line)) }, block.align));
    }
  }
  return out;
}

export function isPlain(blocks: Block[]): boolean {
  return blocks.every((block) => block.kind === "p" && !block.align && block.inlines.every((part) => !styled(part)));
}

export function plainToBlocks(content: string): Block[] {
  if (content === "") return [];
  return content.split("\n").map((line) => ({ kind: "p" as const, inlines: line ? [{ text: line }] : [] }));
}

export function markdownToBlocks(content: string): Block[] {
  if (content === "") return [];
  const blocks: Block[] = [];
  for (const raw of content.split("\n")) {
    if (raw.startsWith("\\")) {
      const rest = raw.slice(1);
      if (MARKER.test(rest)) {
        blocks.push({ kind: "p", inlines: parseInline(rest) });
        continue;
      }
    }
    let align: BlockAlign | undefined;
    let line = raw;
    if (line.startsWith("::: ")) {
      align = "justify";
      line = line.slice(4);
    }
    const heading = /^#{1,3} (.*)$/.exec(line);
    const quote = /^> (.*)$/.exec(line);
    const bullet = /^- (.*)$/.exec(line);
    const ordered = /^\d+\. (.*)$/.exec(line);
    if (heading) blocks.push(withAlign({ kind: "h2", inlines: parseInline(heading[1]) }, align));
    else if (quote) blocks.push(withAlign({ kind: "quote", inlines: parseInline(quote[1]) }, align));
    else if (bullet) pushItem(blocks, "ul", parseInline(bullet[1]), align);
    else if (ordered) pushItem(blocks, "ol", parseInline(ordered[1]), align);
    else blocks.push(withAlign({ kind: "p", inlines: parseInline(line) }, align));
  }
  return blocks;
}

function pushItem(blocks: Block[], kind: "ul" | "ol", item: Inline[], align?: BlockAlign) {
  const last = blocks[blocks.length - 1];
  if (last && last.kind === kind && last.align === align) last.items.push(item);
  else blocks.push(withAlign({ kind, items: [item] }, align));
}

export function blocksToPlain(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "ul" || block.kind === "ol") return block.items.map((item) => inlineText(item)).join("\n");
      return inlineText(block.inlines);
    })
    .join("\n");
}

function alignLine(line: string, align?: BlockAlign) {
  return align === "justify" ? `::: ${line}` : line;
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "h2") return alignLine(`## ${inlineMarkdown(block.inlines)}`, block.align);
      if (block.kind === "quote") return alignLine(`> ${inlineMarkdown(block.inlines)}`, block.align);
      if (block.kind === "ul") return block.items.map((item) => alignLine(`- ${inlineMarkdown(item)}`, block.align)).join("\n");
      if (block.kind === "ol") return block.items.map((item, index) => alignLine(`${index + 1}. ${inlineMarkdown(item)}`, block.align)).join("\n");
      return alignLine(escapeLineStart(inlineMarkdown(block.inlines)), block.align);
    })
    .join("\n");
}

export function loadBlocks(content: string, format: ContentFormat): Block[] {
  return format === "markdown" ? markdownToBlocks(content) : plainToBlocks(content);
}

export function saveBlocks(blocks: Block[]): { content: string; format: ContentFormat } {
  const normal = splitLines(blocks);
  if (isPlain(normal)) return { content: blocksToPlain(normal), format: "plain" };
  return { content: blocksToMarkdown(normal), format: "markdown" };
}

export function readBlocks(root: ParentNode): Block[] {
  const blocks: Block[] = [];
  let loose: Inline[] = [];
  function flush() {
    if (!loose.length) return;
    blocks.push({ kind: "p", inlines: merge(loose) });
    loose = [];
  }
  for (const child of root.childNodes) {
    if (child.nodeType === 3) {
      if (child.textContent) loose.push({ text: child.textContent });
      continue;
    }
    if (!(child instanceof Element)) continue;
    const name = child.nodeName;
    if (name === "UL" || name === "OL") {
      flush();
      const items = [...child.children]
        .filter((node) => node.nodeName === "LI")
        .map((node) => readInlines(node));
      blocks.push(withAlign({ kind: name === "UL" ? "ul" : "ol", items }, readAlign(child)));
    } else if (name === "BLOCKQUOTE") {
      flush();
      blocks.push(withAlign({ kind: "quote", inlines: sized(child, readInlines(child)) }, readAlign(child)));
    } else if (name === "H1" || name === "H2" || name === "H3") {
      flush();
      blocks.push(withAlign({ kind: "h2", inlines: sized(child, readInlines(child)) }, readAlign(child)));
    } else if (name === "DIV" || name === "P") {
      flush();
      blocks.push(withAlign({ kind: "p", inlines: sized(child, readInlines(child)) }, readAlign(child)));
    } else if (name === "BR") {
      flush();
      blocks.push({ kind: "p", inlines: [] });
    } else {
      loose.push(...readInlines(child));
    }
  }
  flush();
  return blocks;
}

const PLACEHOLDER_HOST = new Set(["P", "DIV", "H1", "H2", "H3", "BLOCKQUOTE", "LI"]);

/** <br> в конце абзаца держит каретку. Пустой абзац состоит из одного такого <br>. Это не перенос. */
function placeholderBreak(parent: Node, br: Node): boolean {
  if (!(parent instanceof Element) || !PLACEHOLDER_HOST.has(parent.nodeName)) return false;
  const significant = [...parent.childNodes].filter((child) => {
    if (child.nodeType === 3) return !!child.textContent;
    return child instanceof Element;
  });
  return significant.length > 0 && significant[significant.length - 1] === br;
}

function attr(el: Element, name: string): string | null {
  if (typeof el.getAttribute !== "function") return null;
  return el.getAttribute(name);
}

function readAlign(el: Element): BlockAlign | undefined {
  if (attr(el, "data-align") === "justify") return "justify";
  const style = (el as HTMLElement).style;
  return style && style.textAlign === "justify" ? "justify" : undefined;
}

function sized(el: Element, parts: Inline[]): Inline[] {
  const size = attr(el, "data-size");
  if (size !== "s" && size !== "l" && size !== "xl") return parts;
  return merge(parts.map((part) => (part.size ? part : marks({ ...part, size }))));
}

function readInlines(node: Node, marksIn: { bold?: boolean; italic?: boolean; underline?: boolean; size?: TextSize } = {}): Inline[] {
  const out: Inline[] = [];
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      if (child.textContent) out.push(marks({ text: child.textContent, ...marksIn }));
      continue;
    }
    if (!(child instanceof Element)) continue;
    const name = child.nodeName;
    if (name === "BR") {
      if (!placeholderBreak(node, child)) out.push(marks({ text: "\n", ...marksIn }));
      continue;
    }
    const next = { ...marksIn };
    if (name === "B" || name === "STRONG") next.bold = true;
    if (name === "I" || name === "EM") next.italic = true;
    if (name === "U") next.underline = true;
    const deco = (child as HTMLElement).style?.textDecoration ?? "";
    if (deco.includes("underline")) next.underline = true;
    const size = attr(child, "data-size");
    if (size === "s" || size === "l" || size === "xl") next.size = size;
    const font = name === "FONT" ? attr(child, "size") : null;
    if (font === "1" || font === "2") next.size = "s";
    if (font === "4" || font === "5") next.size = "l";
    if (font === "6" || font === "7") next.size = "xl";
    out.push(...readInlines(child, next));
  }
  return merge(out);
}

export function writeBlocks(root: HTMLElement, blocks: Block[]) {
  root.replaceChildren();
  const source = blocks.length ? blocks : [{ kind: "p" as const, inlines: [] }];
  for (const block of source) {
    if (block.kind === "ul" || block.kind === "ol") {
      const list = document.createElement(block.kind);
      paintBlock(list, block.align);
      const items = block.items.length ? block.items : [[]];
      for (const item of items) {
        const li = document.createElement("li");
        appendInlines(li, item);
        list.append(li);
      }
      root.append(list);
      continue;
    }
    const tag = block.kind === "h2" ? "h2" : block.kind === "quote" ? "blockquote" : "p";
    const el = document.createElement(tag);
    paintBlock(el, block.align);
    appendInlines(el, block.inlines);
    root.append(el);
  }
}

function paintBlock(el: HTMLElement, align?: BlockAlign) {
  if (align !== "justify") return;
  if (typeof el.setAttribute === "function") el.setAttribute("data-align", "justify");
  if (el.style) el.style.textAlign = "justify";
}

function appendInlines(parent: HTMLElement, parts: Inline[]) {
  if (!parts.length || parts.every((part) => part.text === "")) {
    parent.append(document.createElement("br"));
    return;
  }
  for (const part of parts) {
    const lines = part.text.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) parent.append(document.createElement("br"));
      if (!line) return;
      let node: Node = document.createTextNode(line);
      if (part.italic) {
        const em = document.createElement("em");
        em.append(node);
        node = em;
      }
      if (part.bold) {
        const strong = document.createElement("strong");
        strong.append(node);
        node = strong;
      }
      if (part.underline) {
        const u = document.createElement("u");
        u.append(node);
        node = u;
      }
      if (part.size) {
        const span = document.createElement("span");
        span.className = `writing-size-${part.size}`;
        if (typeof span.setAttribute === "function") span.setAttribute("data-size", part.size);
        span.append(node);
        node = span;
      }
      parent.append(node);
    });
  }
}

function orderPoints(anchor: CaretPoint, focus: CaretPoint) {
  const flip = focus.block < anchor.block || (focus.block === anchor.block && focus.offset < anchor.offset);
  return flip ? { start: focus, end: anchor } : { start: anchor, end: focus };
}

function textLength(parts: Inline[]) {
  return parts.reduce((sum, part) => sum + part.text.length, 0);
}

function mapParts(
  parts: Inline[],
  start: number,
  end: number,
  whole: boolean,
  patch: (part: Inline) => Inline,
): Inline[] {
  if (whole) return merge(parts.map((part) => patch(marks(part))));
  const out: Inline[] = [];
  let cursor = 0;
  for (const part of parts) {
    const next = cursor + part.text.length;
    if (!part.text || next <= start || cursor >= end) out.push(part);
    else {
      const from = Math.max(0, start - cursor);
      const to = Math.min(part.text.length, end - cursor);
      if (from > 0) out.push(marks({ ...part, text: part.text.slice(0, from) }));
      if (to > from) out.push(patch(marks({ ...part, text: part.text.slice(from, to) })));
      if (to < part.text.length) out.push(marks({ ...part, text: part.text.slice(to) }));
    }
    cursor = next;
  }
  return merge(out);
}

/** Меняет размер выделенного текста. Без выделения — весь текущий абзац или пункт. */
export function applyTextSize(blocks: Block[], anchor: CaretPoint, focus: CaretPoint, size: TextSize | null): Block[] {
  if (!blocks.length) return blocks;
  const { start, end } = orderPoints(anchor, focus);
  const collapsed = start.block === end.block && start.offset === end.offset;
  return blocks.map((block, index) => {
    if (index < start.block || index > end.block) return block;
    const patch = (part: Inline): Inline => {
      const next = { ...part };
      if (size) next.size = size;
      else delete next.size;
      return marks(next);
    };
    if (block.kind === "ul" || block.kind === "ol") {
      return {
        ...block,
        items: mapListItems(
          block.items,
          index === start.block ? start.offset : 0,
          index === end.block ? end.offset : Number.POSITIVE_INFINITY,
          collapsed,
          patch,
        ),
      };
    }
    const from = collapsed || index !== start.block ? 0 : start.offset;
    const to = collapsed || index !== end.block ? Number.POSITIVE_INFINITY : end.offset;
    return { ...block, inlines: mapParts(block.inlines, from, Number.isFinite(to) ? to : textLength(block.inlines), collapsed, patch) };
  });
}

function mapListItems(
  items: Inline[][],
  from: number,
  to: number,
  collapsed: boolean,
  patch: (part: Inline) => Inline,
): Inline[][] {
  let cursor = 0;
  return items.map((item, index) => {
    const length = textLength(item);
    const itemStart = cursor;
    const itemEnd = cursor + length;
    cursor = itemEnd;
    if (collapsed) {
      const atStart = from === itemStart;
      const inside = from > itemStart && from < itemEnd;
      const atEndOfLast = from === itemEnd && index === items.length - 1;
      return atStart || inside || atEndOfLast ? mapParts(item, 0, length, true, patch) : item;
    }
    const start = Math.max(0, from - itemStart);
    const end = Math.min(length, to - itemStart);
    if (start >= end) return item;
    return mapParts(item, start, end, false, patch);
  });
}

function listParts(items: Inline[][], from: number, to: number): Inline[] {
  const inside: Inline[] = [];
  let cursor = 0;
  for (const item of items) {
    const length = textLength(item);
    const start = Math.max(0, from - cursor);
    const end = Math.min(length, to - cursor);
    if (start < end) inside.push(...sliceParts(item, start, end));
    cursor += length;
  }
  return inside;
}

function sliceParts(parts: Inline[], start: number, end: number): Inline[] {
  const out: Inline[] = [];
  let cursor = 0;
  for (const part of parts) {
    const next = cursor + part.text.length;
    if (part.text && next > start && cursor < end) {
      const from = Math.max(0, start - cursor);
      const to = Math.min(part.text.length, end - cursor);
      if (to > from) out.push({ ...part, text: part.text.slice(from, to) });
    }
    cursor = next;
  }
  return out;
}

/** Подчёркивает выделенный кусок. Пустое выделение не трогает уже написанное. */
export function toggleUnderline(blocks: Block[], anchor: CaretPoint, focus: CaretPoint): Block[] {
  if (!blocks.length) return blocks;
  const { start, end } = orderPoints(anchor, focus);
  if (start.block === end.block && start.offset === end.offset) return blocks;
  const inside: Inline[] = [];
  blocks.forEach((block, index) => {
    if (index < start.block || index > end.block) return;
    if (block.kind === "ul" || block.kind === "ol") {
      inside.push(
        ...listParts(
          block.items,
          index === start.block ? start.offset : 0,
          index === end.block ? end.offset : Number.POSITIVE_INFINITY,
        ),
      );
      return;
    }
    const from = index === start.block ? start.offset : 0;
    const to = index === end.block ? end.offset : textLength(block.inlines);
    inside.push(...sliceParts(block.inlines, from, to));
  });
  const clear = inside.length > 0 && inside.every((part) => part.underline);
  return blocks.map((block, index) => {
    if (index < start.block || index > end.block) return block;
    const patch = (part: Inline): Inline => {
      const next = { ...part, underline: clear ? undefined : true };
      if (clear) delete next.underline;
      return marks(next);
    };
    if (block.kind === "ul" || block.kind === "ol") {
      return {
        ...block,
        items: mapListItems(
          block.items,
          index === start.block ? start.offset : 0,
          index === end.block ? end.offset : Number.POSITIVE_INFINITY,
          false,
          patch,
        ),
      };
    }
    const from = index !== start.block ? 0 : start.offset;
    const to = index !== end.block ? Number.POSITIVE_INFINITY : end.offset;
    return { ...block, inlines: mapParts(block.inlines, from, Number.isFinite(to) ? to : textLength(block.inlines), false, patch) };
  });
}

function withoutAlign(block: Block): Block {
  const next = { ...block };
  delete next.align;
  return next;
}

/** Выравнивание по ширине для абзацев, которых касается выделение. Повторный клик снимает его. */
export function toggleJustify(blocks: Block[], start: number, end: number): Block[] {
  if (!blocks.length) return [{ kind: "p", inlines: [] }];
  const from = Math.max(0, Math.min(start, end, blocks.length - 1));
  const to = Math.max(from, Math.min(Math.max(start, end), blocks.length - 1));
  const clear = blocks.slice(from, to + 1).every((block) => block.align === "justify");
  return blocks.map((block, index) => {
    if (index < from || index > to) return block;
    return clear ? withoutAlign(block) : { ...block, align: "justify" };
  });
}

function glueLists(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const block of blocks) {
    const prev = out[out.length - 1];
    if (
      prev &&
      (prev.kind === "ul" || prev.kind === "ol") &&
      prev.kind === block.kind &&
      prev.align === block.align &&
      (block.kind === "ul" || block.kind === "ol")
    ) {
      prev.items.push(...block.items);
    } else out.push(block);
  }
  return out;
}

/** Делает из абзацев список или возвращает пункты обратно в абзацы. */
export function toggleList(blocks: Block[], start: number, end: number, kind: "ul" | "ol"): Block[] {
  const source = blocks.length ? blocks : [{ kind: "p" as const, inlines: [] }];
  const from = Math.max(0, Math.min(start, end, source.length - 1));
  const to = Math.max(from, Math.min(Math.max(start, end), source.length - 1));
  const slice = source.slice(from, to + 1);
  const same = slice.every((block) => block.kind === kind);
  let middle: Block[];
  if (same) {
    middle = slice.flatMap((block) =>
      block.kind === "ul" || block.kind === "ol"
        ? (block.items.length ? block.items : [[]]).map((inlines) => withAlign({ kind: "p" as const, inlines }, block.align))
        : [],
    );
    if (!middle.length) middle = [{ kind: "p", inlines: [] }];
  } else {
    const items: Inline[][] = [];
    let align: BlockAlign | undefined;
    for (const block of slice) {
      if (block.align) align = block.align;
      if (block.kind === "ul" || block.kind === "ol") items.push(...(block.items.length ? block.items : [[]]));
      else items.push(block.inlines);
    }
    middle = [withAlign({ kind, items: items.length ? items : [[]] }, align)];
  }
  return glueLists([...source.slice(0, from), ...middle, ...source.slice(to + 1)]);
}
