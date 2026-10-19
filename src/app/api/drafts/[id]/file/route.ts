import { AccessDeniedError, requireCabinetAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const SAFE_DOC_TYPES = new Set([
  "application/pdf",
  "application/epub+zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/plain",
  "application/octet-stream",
]);

function decodeDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const marker = ";base64,";
  const splitAt = dataUrl.indexOf(marker);
  if (!dataUrl.startsWith("data:") || splitAt < 0 || splitAt > 200) return null;
  const mime = dataUrl.slice("data:".length, splitAt).split(";")[0]?.trim().toLowerCase() ?? "";
  const bytes = Buffer.from(dataUrl.slice(splitAt + marker.length), "base64");
  if (!mime || bytes.length === 0) return null;
  return { mime, bytes };
}

function contentDisposition(fileName: string): string {
  const cleaned = fileName.replace(/[\r\n"]/g, "").trim().slice(0, 120) || "file";
  const ascii = cleaned.replace(/[^\w.\- ()[\]]+/g, "_") || "file";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const draft = await prisma.draft.findUnique({
      where: { id },
      select: { studentId: true, fileName: true },
    });
    if (!draft) return new Response(null, { status: 404 });
    await requireCabinetAccess(draft.studentId);

    const stored = await prisma.draft.findUnique({ where: { id }, select: { fileData: true } });
    if (!stored?.fileData) return new Response(null, { status: 404 });
    const decoded = decodeDataUrl(stored.fileData);
    if (!decoded) return new Response(null, { status: 404 });
    const mime = SAFE_DOC_TYPES.has(decoded.mime) ? decoded.mime : "application/octet-stream";

    return new Response(new Uint8Array(decoded.bytes), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(decoded.bytes.length),
        "Content-Disposition": contentDisposition(draft.fileName || "file"),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      const status = error.message === "Не авторизован" ? 401 : 403;
      return Response.json({ error: error.message }, { status });
    }
    throw error;
  }
}
