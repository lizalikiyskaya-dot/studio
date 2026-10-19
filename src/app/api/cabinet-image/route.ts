import { AccessDeniedError, requireCabinetAccess } from "@/lib/access";
import { isBookImageSlot, isPortraitKind, type BookImageSlot, type PortraitKind } from "@/lib/cabinetImage";
import { prisma } from "@/lib/prisma";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function decodeDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const marker = ";base64,";
  const splitAt = dataUrl.indexOf(marker);
  if (!dataUrl.startsWith("data:") || splitAt < 0 || splitAt > 200) return null;
  const mime = dataUrl.slice("data:".length, splitAt).split(";")[0]?.trim().toLowerCase() ?? "";
  const bytes = Buffer.from(dataUrl.slice(splitAt + marker.length), "base64");
  if (!mime || bytes.length === 0) return null;
  return { mime, bytes };
}

function imageResponse(dataUrl: string): Response {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded || !IMAGE_TYPES.has(decoded.mime)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(decoded.bytes), {
    status: 200,
    headers: {
      "Content-Type": decoded.mime,
      "Content-Length": String(decoded.bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function bookImage(id: string, slot: BookImageSlot): Promise<string | null> {
  const book = await prisma.book.findUnique({ where: { id }, select: { studentId: true } });
  if (!book) return null;
  await requireCabinetAccess(book.studentId);
  if (slot === "card") {
    const rows = await prisma.$queryRaw<Array<{ url: string | null }>>`
      SELECT CASE WHEN "coverUrl" IS NOT NULL THEN "coverUrl" ELSE "bannerUrl" END AS url
      FROM "Book" WHERE id = ${id}
    `;
    return rows[0]?.url ?? null;
  }
  if (slot === "cover") return (await prisma.book.findUnique({ where: { id }, select: { coverUrl: true } }))?.coverUrl ?? null;
  if (slot === "cover2") return (await prisma.book.findUnique({ where: { id }, select: { coverUrl2: true } }))?.coverUrl2 ?? null;
  if (slot === "cover3") return (await prisma.book.findUnique({ where: { id }, select: { coverUrl3: true } }))?.coverUrl3 ?? null;
  if (slot === "banner") return (await prisma.book.findUnique({ where: { id }, select: { bannerUrl: true } }))?.bannerUrl ?? null;
  return (await prisma.book.findUnique({ where: { id }, select: { settingPhotoUrl: true } }))?.settingPhotoUrl ?? null;
}

async function cycleImage(id: string, slot: BookImageSlot): Promise<string | null> {
  const cycle = await prisma.cycle.findUnique({ where: { id }, select: { studentId: true } });
  if (!cycle) return null;
  await requireCabinetAccess(cycle.studentId);
  if (slot === "card") {
    const rows = await prisma.$queryRaw<Array<{ url: string | null }>>`
      SELECT CASE WHEN "coverUrl" IS NOT NULL THEN "coverUrl" ELSE "bannerUrl" END AS url
      FROM "Cycle" WHERE id = ${id}
    `;
    return rows[0]?.url ?? null;
  }
  if (slot === "cover") return (await prisma.cycle.findUnique({ where: { id }, select: { coverUrl: true } }))?.coverUrl ?? null;
  if (slot === "cover2") return (await prisma.cycle.findUnique({ where: { id }, select: { coverUrl2: true } }))?.coverUrl2 ?? null;
  if (slot === "cover3") return (await prisma.cycle.findUnique({ where: { id }, select: { coverUrl3: true } }))?.coverUrl3 ?? null;
  if (slot === "banner") return (await prisma.cycle.findUnique({ where: { id }, select: { bannerUrl: true } }))?.bannerUrl ?? null;
  return (await prisma.cycle.findUnique({ where: { id }, select: { settingPhotoUrl: true } }))?.settingPhotoUrl ?? null;
}

async function portrait(kind: PortraitKind, id: string): Promise<string | null> {
  if (kind === "pop-arc") {
    const row = await prisma.popArcCharacter.findUnique({ where: { id }, select: { studentId: true } });
    if (!row) return null;
    await requireCabinetAccess(row.studentId);
    return (await prisma.popArcCharacter.findUnique({ where: { id }, select: { photoUrl: true } }))?.photoUrl ?? null;
  }
  if (kind === "belief") {
    const row = await prisma.beliefCard.findUnique({ where: { id }, select: { studentId: true } });
    if (!row) return null;
    await requireCabinetAccess(row.studentId);
    return (await prisma.beliefCard.findUnique({ where: { id }, select: { photoUrl: true } }))?.photoUrl ?? null;
  }
  const row = await prisma.storyCircleCard.findUnique({ where: { id }, select: { studentId: true } });
  if (!row) return null;
  await requireCabinetAccess(row.studentId);
  return (await prisma.storyCircleCard.findUnique({ where: { id }, select: { photoUrl: true } }))?.photoUrl ?? null;
}

async function userAvatar(id: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return null;
  await requireCabinetAccess(user.id);
  const row = await prisma.user.findUnique({ where: { id }, select: { avatarUrl: true } });
  return row?.avatarUrl ?? null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slot = url.searchParams.get("slot") ?? "";
    const bookId = url.searchParams.get("book");
    const cycleId = url.searchParams.get("cycle");
    const userId = url.searchParams.get("user");
    const portraitKind = url.searchParams.get("portrait");
    const portraitId = url.searchParams.get("id");

    let dataUrl: string | null = null;
    if (portraitKind && portraitId) {
      if (!isPortraitKind(portraitKind)) return new Response(null, { status: 404 });
      dataUrl = await portrait(portraitKind, portraitId);
    } else if (bookId) {
      if (!isBookImageSlot(slot)) return new Response(null, { status: 404 });
      dataUrl = await bookImage(bookId, slot);
    } else if (cycleId) {
      if (!isBookImageSlot(slot)) return new Response(null, { status: 404 });
      dataUrl = await cycleImage(cycleId, slot);
    } else if (userId && slot === "avatar") {
      dataUrl = await userAvatar(userId);
    } else {
      return new Response(null, { status: 404 });
    }

    if (!dataUrl) return new Response(null, { status: 404 });
    return imageResponse(dataUrl);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      const status = error.message === "Не авторизован" ? 401 : 403;
      return Response.json({ error: error.message }, { status });
    }
    throw error;
  }
}
