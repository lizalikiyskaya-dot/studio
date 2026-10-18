import { prisma } from "@/lib/prisma";
import { AccessDeniedError, requireAuthenticated } from "@/lib/access";
import { forgetGuidesSchema, guidesSchemaReady } from "@/lib/guides";

const SAFE_DOC_TYPES = new Set([
  "application/pdf",
  "application/epub+zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/plain",
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

function contentDisposition(fileName: string, inline: boolean): string {
  const cleaned = fileName.replace(/[\r\n"]/g, "").trim().slice(0, 120) || "file";
  const ascii = cleaned.replace(/[^\w.\- ()[\]]+/g, "_") || "file";
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuthenticated();
    const { id } = await params;
    if (!(await guidesSchemaReady())) return new Response(null, { status: 404 });

    const guide = await prisma.guide.findUnique({
      where: { id },
      select: { id: true, fileUrl: true, fileName: true },
    });
    if (!guide?.fileUrl) return new Response(null, { status: 404 });

    if (session.role !== "MENTOR") {
      const access = await prisma.guideAccess.findUnique({
        where: { guideId_studentId: { guideId: id, studentId: session.userId } },
        select: { visible: true },
      });
      if (!access?.visible) return new Response(null, { status: 404 });
    }

    const decoded = decodeDataUrl(guide.fileUrl);
    if (!decoded) return new Response(null, { status: 404 });

    const mime = SAFE_DOC_TYPES.has(decoded.mime) ? decoded.mime : "application/octet-stream";
    const inline = mime === "application/pdf" && new URL(request.url).searchParams.get("inline") === "1";

    return new Response(new Uint8Array(decoded.bytes), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(decoded.bytes.length),
        "Content-Disposition": contentDisposition(guide.fileName || "metodichka", inline),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      const status = error.message === "Не авторизован" ? 401 : 403;
      return Response.json({ error: error.message }, { status });
    }
    if (error && typeof error === "object" && "code" in error) {
      const code = String((error as { code?: unknown }).code);
      if (code === "P2021" || code === "P2022") {
        forgetGuidesSchema();
        return new Response(null, { status: 404 });
      }
    }
    throw error;
  }
}
