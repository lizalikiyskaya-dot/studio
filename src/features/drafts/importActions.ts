"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { appUrl } from "@/lib/mail";
import { mentorTextLineTitle, queueMentorDigest } from "@/lib/mentorDigest";
import { countSigns } from "./manuscriptCount";
import {
  DOCX_MAX_BYTES,
  DocxError,
  googleDocExportUrl,
  parseHeadingLevel,
  splitDocx,
  type DocxPiece,
} from "./docxSplit";

const MAX_CHAPTERS = 60;
const MAX_CHAPTER_CHARS = 400_000;

export type ManuscriptImportPreview =
  | { ok: true; pieces: DocxPiece[]; note: string | null }
  | { ok: false; error: string };

export type ImportedChapter = {
  id: string;
  title: string;
  order: number;
  plannedChars: number;
  writtenChars: number;
  writtenHere: boolean;
  manuscript: string;
  manuscriptFormat: string;
};

export type ManuscriptImportCommit =
  | { ok: true; chapters: ImportedChapter[] }
  | { ok: false; error: string };

const ERRORS: Record<DocxError["code"] | "closed" | "network" | "url" | "both" | "missing", string> = {
  "not-docx": "Это не документ Word. Нужен файл .docx.",
  "too-big": "Файл больше 8 МБ. Разделите его на части.",
  empty: "В документе нет текста.",
  closed: "Документ закрыт. Откройте доступ «всем, у кого есть ссылка» или загрузите файл .docx.",
  network: "Не удалось скачать документ. Проверьте ссылку или загрузите файл.",
  url: "Нужна ссылка на Google Документ.",
  both: "Приложите файл или вставьте ссылку — что-то одно.",
  missing: "Приложите файл .docx или вставьте ссылку на Google Документ.",
};

export async function previewManuscriptImport(formData: FormData): Promise<ManuscriptImportPreview> {
  const bookId = String(formData.get("bookId") ?? "");
  const level = parseHeadingLevel(formData.get("level"));
  if (!level) return { ok: false, error: "Выберите уровень заголовка." };
  const book = await loadBook(bookId);
  if (!book.ok) return book;
  await requireCabinetAccess(book.studentId);

  const upload = formData.get("file");
  const file = isUpload(upload) ? upload : null;
  const fileName = file && "name" in file && typeof file.name === "string" ? file.name : "";
  const url = String(formData.get("url") ?? "").trim();
  if (file && url) return { ok: false, error: ERRORS.both };
  if (!file && !url) return { ok: false, error: ERRORS.missing };
  if (file && isLegacyDoc(fileName)) {
    return { ok: false, error: "Старый формат .doc не читается. Сохраните документ как .docx." };
  }

  try {
    const bytes = file ? await fileBytes(file) : await downloadDocx(url);
    const split = splitDocx(bytes, level);
    return { ok: true, pieces: split.pieces, note: split.note };
  } catch (error) {
    return { ok: false, error: messageOf(error) };
  }
}

export async function commitManuscriptImport(
  bookId: string,
  pieces: { title: string; text: string }[],
): Promise<ManuscriptImportCommit> {
  const book = await loadBook(bookId);
  if (!book.ok) return book;
  const session = await requireCabinetAccess(book.studentId);
  const clean = cleanPieces(pieces);
  if (!clean.ok) return clean;

  const rows = await prisma.$transaction(async (tx) => {
    const actId = await lastActId(tx, bookId);
    const count = await tx.planChapter.count({ where: { bookId } });
    const created: ImportedChapter[] = [];
    for (let index = 0; index < clean.pieces.length; index += 1) {
      const piece = clean.pieces[index];
      const row = await tx.planChapter.create({
        data: {
          bookId,
          order: count + index,
          actId,
          title: piece.title,
          manuscript: piece.text,
          manuscriptFormat: "plain",
          writtenHere: true,
          writtenChars: piece.chars,
        },
      });
      created.push({
        id: row.id,
        title: row.title,
        order: row.order,
        plannedChars: row.plannedChars,
        writtenChars: row.writtenChars,
        writtenHere: row.writtenHere,
        manuscript: row.manuscript,
        manuscriptFormat: row.manuscriptFormat,
      });
    }
    return created;
  });

  if (session.role === "MENTOR") {
    for (const row of rows) {
      await queueMentorDigest({
        studentId: book.studentId,
        group: "text",
        sourceId: `PlanChapter:${row.id}`,
        title: mentorTextLineTitle("PlanChapter", row.title),
        url: `${appUrl()}/dashboard/drafts`,
      });
    }
  }
  return { ok: true, chapters: rows };
}

async function loadBook(bookId: string): Promise<{ ok: true; studentId: string } | { ok: false; error: string }> {
  if (!bookId) return { ok: false, error: "Сначала создайте книгу в разделе «О книге»." };
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return { ok: false, error: "Книга не найдена." };
  return { ok: true, studentId: book.studentId };
}

function cleanPieces(
  pieces: { title: string; text: string }[],
): { ok: true; pieces: { title: string; text: string; chars: number }[] } | { ok: false; error: string } {
  if (!Array.isArray(pieces) || pieces.length === 0) {
    return { ok: false, error: "Отметьте хотя бы одну часть." };
  }
  if (pieces.length > MAX_CHAPTERS) {
    return { ok: false, error: `За один раз можно создать не больше ${MAX_CHAPTERS} глав.` };
  }
  const clean: { title: string; text: string; chars: number }[] = [];
  for (const piece of pieces) {
    const title = String(piece?.title ?? "").replace(/\s+/g, " ").trim().slice(0, 200) || "Без названия";
    const text = String(piece?.text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (text.length > MAX_CHAPTER_CHARS) {
      return { ok: false, error: `Глава «${title}» слишком длинная. Разделите документ.` };
    }
    clean.push({ title, text, chars: countSigns(text, "plain") });
  }
  return { ok: true, pieces: clean };
}

async function lastActId(tx: Prisma.TransactionClient, bookId: string) {
  const last = await tx.act.findFirst({ where: { bookId }, orderBy: { order: "desc" } });
  if (last) return last.id;
  const created = await tx.act.create({ data: { bookId, order: 0, title: "Акт 1" } });
  return created.id;
}

function isLegacyDoc(name: string) {
  const lower = name.toLowerCase();
  return lower.endsWith(".doc") && !lower.endsWith(".docx");
}

function isUpload(value: FormDataEntryValue | null): value is File {
  return !!value && typeof value !== "string" && value.size > 0;
}

async function fileBytes(file: Blob) {
  if (file.size > DOCX_MAX_BYTES) throw new DocxError("too-big");
  return new Uint8Array(await file.arrayBuffer());
}

async function downloadDocx(input: string) {
  const exportUrl = googleDocExportUrl(input);
  if (!exportUrl) throw new Error("url");
  let current = exportUrl;
  for (let hop = 0; hop < 4; hop += 1) {
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*" },
      });
    } catch {
      throw new Error("network");
    }
    if (response.status >= 300 && response.status < 400) {
      const next = follow(response.headers.get("location"), current);
      if (!next) throw new Error("closed");
      current = next;
      continue;
    }
    if (response.status !== 200) throw new Error("closed");
    const bytes = await readLimited(response);
    if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      const head = new TextDecoder().decode(bytes.subarray(0, 240)).toLowerCase();
      if (head.includes("<html") || head.includes("<!doctype")) throw new Error("closed");
      throw new DocxError("not-docx");
    }
    return bytes;
  }
  throw new Error("closed");
}

function follow(location: string | null, current: string) {
  if (!location) return null;
  let next: URL;
  try {
    next = new URL(location, current);
  } catch {
    return null;
  }
  if (next.protocol !== "https:") return null;
  const host = next.hostname;
  if (host !== "docs.google.com" && !host.endsWith(".googleusercontent.com")) return null;
  return next.toString();
}

async function readLimited(response: Response) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > DOCX_MAX_BYTES) throw new DocxError("too-big");
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > DOCX_MAX_BYTES) throw new DocxError("too-big");
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > DOCX_MAX_BYTES) {
      await reader.cancel();
      throw new DocxError("too-big");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function messageOf(error: unknown) {
  if (error instanceof DocxError) return ERRORS[error.code];
  if (error instanceof Error && error.message in ERRORS) return ERRORS[error.message as keyof typeof ERRORS];
  return ERRORS.network;
}
