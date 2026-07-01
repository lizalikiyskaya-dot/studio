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

async function requireAccessForExampleCard(studentId: string, isExample: boolean) {
  if (isExample) {
    await requireMentor(studentId);
  } else {
    await requireCabinetAccess(studentId);
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
  const isImage =
    target === "book-cover" ||
    target === "book-cover-2" ||
    target === "book-cover-3" ||
    target === "book-banner" ||
    target === "character-photo" ||
    target === "popArc-photo" ||
    target === "world-entry-photo" ||
    target === "cycle-cover" ||
    target === "cycle-character-photo" ||
    target === "story-character-photo" ||
    target === "cycle-world-entry-photo" ||
    target === "story-world-entry-photo" ||
    target === "belief-photo" ||
    target === "storycircle-photo" ||
    target === "setting-photo" ||
    target === "cycle-setting-photo" ||
    target === "story-setting-photo";
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
  } else if (target === "book-cover-2") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { coverUrl2: dataUrl } });
  } else if (target === "book-cover-3") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { coverUrl3: dataUrl } });
  } else if (target === "book-banner") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { bannerUrl: dataUrl } });
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
  } else if (target === "cycle-cover") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { coverUrl: dataUrl } });
  } else if (target === "cycle-character-photo") {
    const character = await prisma.cycleCharacter.findUniqueOrThrow({ where: { id } });
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: character.cycleId } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycleCharacter.update({ where: { id }, data: { photoUrl: dataUrl } });
  } else if (target === "story-character-photo") {
    const character = await prisma.storyCharacter.findUniqueOrThrow({ where: { id } });
    const story = await prisma.story.findUniqueOrThrow({ where: { id: character.storyId } });
    await requireCabinetAccess(story.studentId);
    await prisma.storyCharacter.update({ where: { id }, data: { photoUrl: dataUrl } });
  } else if (target === "cycle-world-entry-photo") {
    const entry = await prisma.cycleWorldEntry.findUniqueOrThrow({ where: { id } });
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: entry.cycleId } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycleWorldEntry.update({ where: { id }, data: { photoUrl: dataUrl } });
  } else if (target === "story-world-entry-photo") {
    const entry = await prisma.storyWorldEntry.findUniqueOrThrow({ where: { id } });
    const story = await prisma.story.findUniqueOrThrow({ where: { id: entry.storyId } });
    await requireCabinetAccess(story.studentId);
    await prisma.storyWorldEntry.update({ where: { id }, data: { photoUrl: dataUrl } });
  } else if (target === "belief-photo") {
    const card = await prisma.beliefCard.findUniqueOrThrow({ where: { id } });
    await requireAccessForExampleCard(card.studentId, card.isExample);
    await prisma.beliefCard.update({ where: { id }, data: { photoUrl: dataUrl } });
  } else if (target === "storycircle-photo") {
    const card = await prisma.storyCircleCard.findUniqueOrThrow({ where: { id } });
    await requireAccessForExampleCard(card.studentId, card.isExample);
    await prisma.storyCircleCard.update({ where: { id }, data: { photoUrl: dataUrl } });
  } else if (target === "setting-photo") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { settingPhotoUrl: dataUrl } });
  } else if (target === "cycle-setting-photo") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { settingPhotoUrl: dataUrl } });
  } else if (target === "story-setting-photo") {
    const story = await prisma.story.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(story.studentId);
    await prisma.story.update({ where: { id }, data: { settingPhotoUrl: dataUrl } });
  } else if (target === "avatar") {
    await requireCabinetAccess(id);
    await prisma.user.update({ where: { id }, data: { avatarUrl: dataUrl } });
  } else {
    return Response.json({ error: "Unknown target" }, { status: 400 });
  }

  return Response.json({ ok: true, fileName: file.name, dataUrl });
}

const PHOTO_FIELD_TARGETS = [
  "book-cover",
  "book-cover-2",
  "book-cover-3",
  "book-banner",
  "character-photo",
  "popArc-photo",
  "world-entry-photo",
  "cycle-cover",
  "cycle-character-photo",
  "story-character-photo",
  "cycle-world-entry-photo",
  "story-world-entry-photo",
  "belief-photo",
  "storycircle-photo",
  "setting-photo",
  "cycle-setting-photo",
  "story-setting-photo",
] as const;

export async function DELETE(req: Request) {
  const body = await req.json();
  const { target, id, field } = body as { target?: string; id?: string; field?: string };

  if (typeof target !== "string" || typeof id !== "string" || typeof field !== "string") {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  if (!PHOTO_FIELD_TARGETS.includes(target as (typeof PHOTO_FIELD_TARGETS)[number])) {
    return Response.json({ error: "Unknown target" }, { status: 400 });
  }

  if (target === "book-cover") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { coverUrl: null } });
  } else if (target === "book-cover-2") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { coverUrl2: null } });
  } else if (target === "book-cover-3") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { coverUrl3: null } });
  } else if (target === "book-banner") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { bannerUrl: null } });
  } else if (target === "character-photo") {
    const character = await prisma.character.findUniqueOrThrow({ where: { id } });
    const book = await prisma.book.findUniqueOrThrow({ where: { id: character.bookId } });
    await requireCabinetAccess(book.studentId);
    await prisma.character.update({ where: { id }, data: { photoUrl: null } });
  } else if (target === "popArc-photo") {
    await requireAccessForPopArcCharacter(id);
    await prisma.popArcCharacter.update({ where: { id }, data: { photoUrl: null } });
  } else if (target === "world-entry-photo") {
    const entry = await prisma.worldEntry.findUniqueOrThrow({ where: { id } });
    const book = await prisma.book.findUniqueOrThrow({ where: { id: entry.bookId } });
    await requireCabinetAccess(book.studentId);
    await prisma.worldEntry.update({ where: { id }, data: { photoUrl: null } });
  } else if (target === "cycle-cover") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { coverUrl: null } });
  } else if (target === "cycle-character-photo") {
    const character = await prisma.cycleCharacter.findUniqueOrThrow({ where: { id } });
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: character.cycleId } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycleCharacter.update({ where: { id }, data: { photoUrl: null } });
  } else if (target === "story-character-photo") {
    const character = await prisma.storyCharacter.findUniqueOrThrow({ where: { id } });
    const story = await prisma.story.findUniqueOrThrow({ where: { id: character.storyId } });
    await requireCabinetAccess(story.studentId);
    await prisma.storyCharacter.update({ where: { id }, data: { photoUrl: null } });
  } else if (target === "cycle-world-entry-photo") {
    const entry = await prisma.cycleWorldEntry.findUniqueOrThrow({ where: { id } });
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: entry.cycleId } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycleWorldEntry.update({ where: { id }, data: { photoUrl: null } });
  } else if (target === "story-world-entry-photo") {
    const entry = await prisma.storyWorldEntry.findUniqueOrThrow({ where: { id } });
    const story = await prisma.story.findUniqueOrThrow({ where: { id: entry.storyId } });
    await requireCabinetAccess(story.studentId);
    await prisma.storyWorldEntry.update({ where: { id }, data: { photoUrl: null } });
  } else if (target === "belief-photo") {
    const card = await prisma.beliefCard.findUniqueOrThrow({ where: { id } });
    await requireAccessForExampleCard(card.studentId, card.isExample);
    await prisma.beliefCard.update({ where: { id }, data: { photoUrl: null } });
  } else if (target === "storycircle-photo") {
    const card = await prisma.storyCircleCard.findUniqueOrThrow({ where: { id } });
    await requireAccessForExampleCard(card.studentId, card.isExample);
    await prisma.storyCircleCard.update({ where: { id }, data: { photoUrl: null } });
  } else if (target === "setting-photo") {
    const book = await prisma.book.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(book.studentId);
    await prisma.book.update({ where: { id }, data: { settingPhotoUrl: null } });
  } else if (target === "cycle-setting-photo") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { settingPhotoUrl: null } });
  } else if (target === "story-setting-photo") {
    const story = await prisma.story.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(story.studentId);
    await prisma.story.update({ where: { id }, data: { settingPhotoUrl: null } });
  }

  return Response.json({ ok: true });
}
