import type { MaterialCategory, MaterialStatus } from "@/generated/prisma/client";

/** Строка списка. В ней нет содержимого PDF/EPUB: страница от этого зависала. */
export type MaterialRow = {
  id: string;
  studentId: string;
  order: number;
  category: MaterialCategory;
  title: string;
  status: MaterialStatus;
  pdfName: string | null;
  epubName: string | null;
  fileName: string | null;
  optional: boolean;
  month: string | null;
  pdfHref: string | null;
  epubHref: string | null;
  fileHref: string | null;
  pdfBytes: number | null;
  epubBytes: number | null;
  fileBytes: number | null;
};

export const MATERIAL_PAGE_SELECT = {
  id: true,
  studentId: true,
  order: true,
  category: true,
  title: true,
  status: true,
  pdfName: true,
  epubName: true,
  fileName: true,
  optional: true,
  month: true,
} as const;

export type MaterialFileKind = "pdf" | "epub" | "file";

export function materialFilePath(id: string, kind: MaterialFileKind): string {
  return `/api/materials/${encodeURIComponent(id)}/file?kind=${kind}`;
}

export function isMaterialFileKind(value: string): value is MaterialFileKind {
  return value === "pdf" || value === "epub" || value === "file";
}

type MaterialCore = {
  id: string;
  studentId: string;
  order: number;
  category: MaterialCategory;
  title: string;
  status: MaterialStatus;
  pdfName: string | null;
  epubName: string | null;
  fileName: string | null;
  optional: boolean;
  month: string | null;
};

export function materialRow(
  material: MaterialCore,
  has: { pdf: boolean; epub: boolean; file: boolean },
  bytes: { pdf: number | null; epub: number | null; file: number | null },
): MaterialRow {
  return {
    ...material,
    pdfHref: has.pdf ? materialFilePath(material.id, "pdf") : null,
    epubHref: has.epub ? materialFilePath(material.id, "epub") : null,
    fileHref: has.file ? materialFilePath(material.id, "file") : null,
    pdfBytes: bytes.pdf,
    epubBytes: bytes.epub,
    fileBytes: bytes.file,
  };
}

/** Новая строка ещё без файла. Содержимое из базы в браузер не копируем. */
export function materialToRow(material: MaterialCore): MaterialRow {
  return materialRow(material, { pdf: false, epub: false, file: false }, { pdf: null, epub: null, file: null });
}
