export function fileKindLabel(fileName: string | null | undefined, mime?: string | null): string {
  const ext = fileName?.split(".").pop()?.trim().toLowerCase() ?? "";
  const byExt: Record<string, string> = {
    pdf: "PDF",
    epub: "EPUB",
    doc: "DOC",
    docx: "DOCX",
    odt: "ODT",
    rtf: "RTF",
    txt: "TXT",
  };
  if (byExt[ext]) return byExt[ext];
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/epub+zip") return "EPUB";
  return ext ? ext.toUpperCase().slice(0, 8) : "файл";
}

export function dataUrlBytes(url: string | null | undefined): number | null {
  if (!url) return null;
  const marker = ";base64,";
  const at = url.indexOf(marker);
  if (at < 0) return null;
  const body = url.length - at - marker.length;
  if (body <= 0) return null;
  return Math.max(1, Math.floor((body * 3) / 4));
}

export function formatFileSize(bytes: number | null | undefined): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  const mb = bytes / (1024 * 1024);
  const digits = mb >= 10 ? 0 : 1;
  return `${mb.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: digits })} МБ`;
}
