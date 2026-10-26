export type ContentFormat = "plain" | "markdown";

export type Inline = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type Block =
  | { kind: "p" | "h2" | "quote"; inlines: Inline[] }
  | { kind: "ul" | "ol"; items: Inline[][] };

const MARKER = /^(#{1,3} |> |- |\d+\. )/;

function marks(part: Inline): Inline {
  return {
    text: part.text,
    ...(part.bold ? { bold: true } : {}),
    ...(part.italic ? { italic: true } : {}),
  };
}

function tidyMarks(parts: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const part of parts) {
    if (!part.bold && !part.italic) {
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
    if (prev && prev.bold === part.bold && prev.italic === part.italic) prev.text += part.text;
    else out.push(marks(part));
  }
  return out;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let bold = false;
  let italic = false;
  let buf = "";
  function flush() {
    if (!buf) return;
    out.push({ text: buf, ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}) });
    buf = "";
  }
  for (let i = 0; i < src.length; i++) {
    if (src[i] === "\\" && i + 1 < src.length) {
      buf += src[i + 1];
      i += 1;
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
  return text.replace(/\\/g, "\\\\").replace(/\*/g, "\\*");
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
      const text = escapeInline(part.text);
      if (!text) return "";
      if (part.bold && part.italic) return `***${text}***`;
      if (part.bold) return `**${text}**`;
      if (part.italic) return `*${text}*`;
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
        items: block.items.map((item) => merge(item.map((part) => ({ ...part, text: part.text.replace(/\n/g, " ") })))),
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
      out.push({ kind: block.kind, inlines: tidyMarks(merge(line)) });
    }
  }
  return out;
}

export function isPlain(blocks: Block[]): boolean {
  return blocks.every((block) => block.kind === "p" && block.inlines.every((part) => !part.bold && !part.italic));
}

export function plainToBlocks(content: string): Block[] {
  if (content === "") return [];
  return content.split("\n").map((line) => ({ kind: "p" as const, inlines: line ? [{ text: line }] : [] }));
}

export function markdownToBlocks(content: string): Block[] {
  if (content === "") return [];
  const blocks: Block[] = [];
  for (const line of content.split("\n")) {
    if (line.startsWith("\\")) {
      const rest = line.slice(1);
      if (MARKER.test(rest)) {
        blocks.push({ kind: "p", inlines: parseInline(rest) });
        continue;
      }
    }
    const heading = /^#{1,3} (.*)$/.exec(line);
    const quote = /^> (.*)$/.exec(line);
    const bullet = /^- (.*)$/.exec(line);
    const ordered = /^\d+\. (.*)$/.exec(line);
    if (heading) blocks.push({ kind: "h2", inlines: parseInline(heading[1]) });
    else if (quote) blocks.push({ kind: "quote", inlines: parseInline(quote[1]) });
    else if (bullet) pushItem(blocks, "ul", parseInline(bullet[1]));
    else if (ordered) pushItem(blocks, "ol", parseInline(ordered[1]));
    else blocks.push({ kind: "p", inlines: parseInline(line) });
  }
  return blocks;
}

function pushItem(blocks: Block[], kind: "ul" | "ol", item: Inline[]) {
  const last = blocks[blocks.length - 1];
  if (last && last.kind === kind) last.items.push(item);
  else blocks.push({ kind, items: [item] });
}

export function blocksToPlain(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "ul" || block.kind === "ol") return block.items.map((item) => inlineText(item)).join("\n");
      return inlineText(block.inlines);
    })
    .join("\n");
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map((block) => {
      if (block.kind === "h2") return `## ${inlineMarkdown(block.inlines)}`;
      if (block.kind === "quote") return `> ${inlineMarkdown(block.inlines)}`;
      if (block.kind === "ul") return block.items.map((item) => `- ${inlineMarkdown(item)}`).join("\n");
      if (block.kind === "ol") return block.items.map((item, index) => `${index + 1}. ${inlineMarkdown(item)}`).join("\n");
      return escapeLineStart(inlineMarkdown(block.inlines));
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
      blocks.push({ kind: name === "UL" ? "ul" : "ol", items });
    } else if (name === "BLOCKQUOTE") {
      flush();
      blocks.push({ kind: "quote", inlines: readInlines(child) });
    } else if (name === "H1" || name === "H2" || name === "H3") {
      flush();
      blocks.push({ kind: "h2", inlines: readInlines(child) });
    } else if (name === "DIV" || name === "P") {
      flush();
      blocks.push({ kind: "p", inlines: readInlines(child) });
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

function readInlines(node: Node, marksIn: { bold?: boolean; italic?: boolean } = {}): Inline[] {
  const out: Inline[] = [];
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      if (child.textContent) out.push({ text: child.textContent, ...marksIn });
      continue;
    }
    if (!(child instanceof Element)) continue;
    const name = child.nodeName;
    if (name === "BR") {
      out.push({ text: "\n", ...marksIn });
      continue;
    }
    const next = { ...marksIn };
    if (name === "B" || name === "STRONG") next.bold = true;
    if (name === "I" || name === "EM") next.italic = true;
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
    appendInlines(el, block.inlines);
    root.append(el);
  }
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
      parent.append(node);
    });
  }
}
