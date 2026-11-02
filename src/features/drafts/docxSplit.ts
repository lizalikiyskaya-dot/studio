import { inflateRawSync } from "node:zlib";
import { countSigns } from "./manuscriptCount";

/** Файл .docx больше этого размера не разбираем. */
export const DOCX_MAX_BYTES = 8 * 1024 * 1024;
const XML_MAX_BYTES = 12 * 1024 * 1024;

export type HeadingLevel = 1 | 2 | 3;

export type DocxPiece = {
  title: string;
  /** 0 — текст до первого заголовка выбранного уровня. */
  level: number;
  text: string;
  chars: number;
  checked: boolean;
};

export type DocxSplit = {
  pieces: DocxPiece[];
  note: string | null;
};

export class DocxError extends Error {
  constructor(readonly code: "not-docx" | "too-big" | "empty") {
    super(code);
  }
}

export function parseHeadingLevel(value: unknown): HeadingLevel | null {
  const level = Number(value);
  if (level === 1 || level === 2 || level === 3) return level;
  return null;
}

/**
 * Обычная ссылка «доступ по ссылке». Скачиваем только собранный нами адрес
 * экспорта, чужой хост и пароль в ссылке не используются.
 */
export function googleDocExportUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (url.hostname !== "docs.google.com") return null;
  const match = url.pathname.match(/^\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  const id = match?.[1] ?? "";
  if (id.length < 10 || id.length > 200) return null;
  return `https://docs.google.com/document/d/${id}/export?format=docx`;
}

export function splitDocx(bytes: Uint8Array, headingLevel: HeadingLevel): DocxSplit {
  if (bytes.byteLength > DOCX_MAX_BYTES) throw new DocxError("too-big");
  const xml = documentXml(bytes);
  return splitDocumentXml(xml, headingLevel);
}

export function splitDocumentXml(xml: string, headingLevel: HeadingLevel): DocxSplit {
  const pieces = piecesFromParagraphs(paragraphs(xml), headingLevel);
  if (pieces.length === 0) throw new DocxError("empty");
  const headings = pieces.some((piece) => piece.level > 0);
  const only = pieces.length === 1;
  const withChecks = pieces.map((piece) => ({
    ...piece,
    checked: only || (headings && piece.level > 0),
  }));
  let note: string | null = null;
  if (!headings) {
    note = "Заголовков этого уровня нет. Весь текст собран в одну главу.";
  } else if (withChecks.some((piece) => piece.level === 0)) {
    note = "Текст до первого заголовка не отмечен. Отметьте его, если это тоже глава.";
  }
  return { pieces: withChecks, note };
}

function documentXml(bytes: Uint8Array): string {
  const files = unzip(bytes);
  const xml = files.get("word/document.xml");
  if (!xml) throw new DocxError("not-docx");
  return new TextDecoder("utf-8").decode(xml).replace(/^\uFEFF/, "");
}

function unzip(data: Uint8Array): Map<string, Uint8Array> {
  if (data.byteLength < 22 || data[0] !== 0x50 || data[1] !== 0x4b) throw new DocxError("not-docx");
  const eocd = findEocd(data);
  const count = u16(data, eocd + 10);
  const cdOffset = u32(data, eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) throw new DocxError("too-big");
  const files = new Map<string, Uint8Array>();
  let cursor = cdOffset;
  for (let index = 0; index < count; index += 1) {
    if (u32(data, cursor) !== 0x02014b50) throw new DocxError("not-docx");
    const method = u16(data, cursor + 10);
    const compSize = u32(data, cursor + 20);
    const rawSize = u32(data, cursor + 24);
    const nameLen = u16(data, cursor + 28);
    const extraLen = u16(data, cursor + 30);
    const commentLen = u16(data, cursor + 32);
    const localOff = u32(data, cursor + 42);
    const name = new TextDecoder("utf-8").decode(data.subarray(cursor + 46, cursor + 46 + nameLen));
    cursor += 46 + nameLen + extraLen + commentLen;
    if (name.toLowerCase() !== "word/document.xml") continue;
    if (method !== 0 && method !== 8) throw new DocxError("not-docx");
    if (compSize > DOCX_MAX_BYTES || rawSize > XML_MAX_BYTES) throw new DocxError("too-big");
    if (u32(data, localOff) !== 0x04034b50) throw new DocxError("not-docx");
    const localName = u16(data, localOff + 26);
    const localExtra = u16(data, localOff + 28);
    const start = localOff + 30 + localName + localExtra;
    const compressed = data.subarray(start, start + compSize);
    if (compressed.byteLength !== compSize) throw new DocxError("not-docx");
    const raw = method === 0 ? compressed : inflate(compressed);
    if (raw.byteLength > XML_MAX_BYTES) throw new DocxError("too-big");
    files.set("word/document.xml", raw);
  }
  return files;
}

function inflate(data: Uint8Array): Uint8Array {
  try {
    return inflateRawSync(data);
  } catch {
    throw new DocxError("not-docx");
  }
}

function findEocd(data: Uint8Array): number {
  const start = Math.max(0, data.length - 22 - 65535);
  for (let index = data.length - 22; index >= start; index -= 1) {
    if (u32(data, index) !== 0x06054b50) continue;
    const comment = u16(data, index + 20);
    if (index + 22 + comment === data.length) return index;
  }
  throw new DocxError("not-docx");
}

function u16(data: Uint8Array, offset: number) {
  if (offset < 0 || offset + 2 > data.length) throw new DocxError("not-docx");
  return data[offset] | (data[offset + 1] << 8);
}

function u32(data: Uint8Array, offset: number) {
  if (offset < 0 || offset + 4 > data.length) throw new DocxError("not-docx");
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

type Paragraph = { level: number | null; text: string };

function paragraphs(xml: string): Paragraph[] {
  const prefix = wordPrefix(xml);
  const pattern = new RegExp(`<${prefix}:p\\b[^>]*/>|<${prefix}:p\\b[^>]*>[\\s\\S]*?</${prefix}:p>`, "g");
  const found = xml.match(pattern) ?? [];
  return found.map((paragraph) => ({
    level: paragraphLevel(paragraph, prefix),
    text: paragraphText(paragraph, prefix),
  }));
}

function wordPrefix(xml: string) {
  const match = /xmlns:([A-Za-z0-9]+)="http:\/\/schemas\.openxmlformats\.org\/wordprocessingml\/2006\/main"/.exec(xml);
  return match?.[1] ?? "w";
}

function paragraphLevel(paragraph: string, prefix: string): number | null {
  const props = new RegExp(`<${prefix}:pPr\\b[^>]*>[\\s\\S]*?</${prefix}:pPr>`).exec(paragraph)?.[0] ?? "";
  const style = attr(new RegExp(`<${prefix}:pStyle\\b[^>]*>`).exec(props)?.[0] ?? "", `${prefix}:val`);
  const fromStyle = style ? styleLevel(style) : null;
  if (fromStyle) return fromStyle;
  const outline = attr(new RegExp(`<${prefix}:outlineLvl\\b[^>]*>`).exec(props)?.[0] ?? "", `${prefix}:val`);
  if (outline === null) return null;
  const level = Number(outline);
  if (!Number.isInteger(level) || level < 0 || level > 8) return null;
  return level + 1;
}

function styleLevel(style: string): number | null {
  const key = style.toLowerCase().replace(/\s+/g, "");
  const named = /^(?:heading|заголовок)(\d)$/.exec(key);
  if (named) return Number(named[1]);
  if (/^[1-9]$/.test(key)) return Number(key);
  return null;
}

function paragraphText(paragraph: string, prefix: string): string {
  const clean = paragraph.replace(new RegExp(`<${prefix}:del\\b[^>]*>[\\s\\S]*?</${prefix}:del>`, "g"), "");
  const pattern = new RegExp(
    `<${prefix}:t\\b[^>]*>([\\s\\S]*?)</${prefix}:t>|<${prefix}:tab\\b[^>]*/>|<${prefix}:br\\b[^>]*/>|<${prefix}:cr\\b[^>]*/>`,
    "g",
  );
  let text = "";
  for (const match of clean.matchAll(pattern)) {
    if (match[1] !== undefined) text += decodeXml(match[1]);
    else if (match[0].includes(":tab")) text += "\t";
    else text += "\n";
  }
  return text.replace(/\u00A0/g, " ");
}

function attr(tag: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"|${name}='([^']*)'`).exec(tag);
  return match?.[1] ?? match?.[2] ?? null;
}

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function pieceText(lines: string[]) {
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function piecesFromParagraphs(rows: Paragraph[], headingLevel: HeadingLevel): Omit<DocxPiece, "checked">[] {
  const pieces: Omit<DocxPiece, "checked">[] = [];
  let title = "";
  let level = 0;
  let lines: string[] = [];
  let started = false;

  function flush() {
    if (!started) return;
    const text = pieceText(lines);
    pieces.push({ title: title || "Без названия", level, text, chars: countSigns(text, "plain") });
  }

  for (const row of rows) {
    const split = row.level !== null && row.level <= headingLevel;
    const line = row.text.replace(/\s+/g, " ").trim();
    if (split) {
      if (!line) continue;
      if (!started) {
        const text = pieceText(lines);
        if (text) {
          pieces.push({ title: "До первой главы", level: 0, text, chars: countSigns(text, "plain") });
        }
      } else {
        flush();
      }
      started = true;
      title = line.slice(0, 200);
      level = row.level ?? headingLevel;
      lines = [];
      continue;
    }
    if (!started) {
      if (!line && lines.length === 0) continue;
      lines.push(row.text.trim());
      continue;
    }
    if (row.level && line) lines.push("", line);
    else lines.push(row.text.trim());
  }
  if (!started) {
    const text = pieceText(lines);
    if (!text) return pieces;
    const first = text.split("\n").find((line) => line.trim())?.replace(/\s+/g, " ").trim() ?? "";
    pieces.push({
      title: (first || "Рукопись").slice(0, 200),
      level: 0,
      text,
      chars: countSigns(text, "plain"),
    });
    return pieces;
  }
  flush();
  return pieces;
}
