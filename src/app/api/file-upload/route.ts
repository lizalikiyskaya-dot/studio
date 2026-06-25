import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";

const MAX_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

async function requireAccessForPopArcCharacter(id: string) {
  const character = await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } });
  if (character.isExample) {
    await requireMentor(character.studentId);
  } else {
    await requireCabinetAccess(character.studentId);
  }
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const target = formData.get("target");
  const id = formData.get("id");
  const field = formData.get("field");
  const file = formData.get("file");

  if (
    typeof target !== "string" ||
    typeof id !== "string" ||
    typeof field !== "string" ||
    !(file instanceof File)
  ) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const isImage = target === "book-cover" || target === "character-photo" || target === "popArc-photo" || target === "world-entry-photo";
  const sizeLimit = isImage ? MAX_IMAGE_SIZE : MAX_SIZE;
  if (file.size > sizeLimit) {
    const mb = sizeLimit / (1024 * 1024);
    return Response.json({ error: `Файл слишком большой (максимум ${mb} МБ)` }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "application/octet-stream"};base64,${buf.toString("base64")}`;

  if (target === "material") {
    const material = await prisma.material.findUniqueOrThrow({ where: { id } });
    await requireMentor(material.studentId);
    const data =
      field === "pdf"
        ? { pdfUrl: dataUrl, pdfName: file.name }
        : field === "epub"
          ? { epubUrl: dataUrl, epubName: file.name }
          : { fileUrl: dataUrl, fileName: file.name };
    await prisma.material.update({ where: { id }, data });
  } else if (target === "draft") {
    const draft = await prisma.draft.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(draft.studentId);
    await prisma.draft.update({ where: { id }, data: { fileName: file.name, fileData: dataUrl } });
  } else if (target === "book-cover") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { coverUrl: dataUrl } });
  } else if (target === "character-photo") {
    const character = await prisma.character.findUniqueOrThrow({ where: { id } });
    const book = await prisma.book.findUniqueOrThrow({ where: { id: character.bookId } });
    await requireCabinetAccess(book.studentId);
    await prisma.character.update({ where: { id }, data: { photoUrl: dataUrl } });
  } else if (target === "popArc-photo") {
    await requireAccessForPopArcCharacter(id);
    await prisma.popArcCharacter.update({ where: { id }, data: { photoUrl: dataUrl } });
  } else if (target === "world-entry-photo") {
    const entry = await prisma.worldEntry.findUniqueOrThrow({ where: { id } });
    const book = await prisma.book.findUniqueOrThrow({ where: { id: entry.bookId } });
    await requireCabinetAccess(book.studentId);
    await prisma.worldEntry.update({ where: { id }, data: { photoUrl: dataUrl } });
  } else {
    return Response.json({ error: "Unknown target" }, { status: 400 });
  }

  return Response.json({ ok: true, fileName: file.name, dataUrl });
}
