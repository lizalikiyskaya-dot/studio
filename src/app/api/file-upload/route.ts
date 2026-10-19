import { prisma } from "@/lib/prisma";
import { AccessDeniedError, requireCabinetAccess, requireMentor, requireMentorSession } from "@/lib/access";
import { guidesSchemaReady } from "@/lib/guides";
import { getSession } from "@/lib/session";
import { shrinkImage } from "@/lib/shrinkImage";

const MAX_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

/**
 * Тип файла НИКОГДА не берём из запроса: `file.type` приходит от клиента и
 * может быть любым, включая text/html или image/svg+xml — а всё содержимое
 * потом уезжает в базу как data: URI и отдаётся обратно в браузер.
 *
 * Картинки: строгий белый список + проверка сигнатуры (первых байт) файла.
 * SVG не поддерживается сознательно — это XML со скриптами внутри.
 */
const IMAGE_SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  "image/png": (b) =>
    b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) =>
    b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  "image/gif": (b) => b.length > 6 && b.subarray(0, 6).toString("ascii").startsWith("GIF8"),
};

/** Документы, которые браузеру безопасно отдавать с их родным типом. */
const SAFE_DOC_TYPES = new Set([
  "application/pdf",
  "application/epub+zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/plain",
]);

/**
 * Возвращает тип, под которым файл ляжет в базу, либо null — если это
 * картинка неизвестного/подделанного формата.
 * Для документов неизвестный тип не отвергаем (чтобы не ломать существующие
 * сценарии), а понижаем до octet-stream: такой файл браузер только скачает,
 * но никогда не отрисует как страницу.
 */
function resolveStoredMime(declared: string, buf: Buffer, isImage: boolean): string | null {
  const type = declared.split(";")[0].trim().toLowerCase();
  if (isImage) {
    const check = IMAGE_SIGNATURES[type];
    if (!check || !check(buf)) return null;
    return type;
  }
  return SAFE_DOC_TYPES.has(type) ? type : "application/octet-stream";
}

/** Имя файла попадает в атрибут download — вычищаем пути и управляющие символы. */
function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "файл";
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\x00-\x1f\x7f"]/g, "").trim().slice(0, 120) || "файл";
}

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
  try {
    return await handleUpload(req);
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      return Response.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }
}

async function handleUpload(req: Request) {
  // Авторизацию проверяем ДО чтения тела запроса: иначе любой аноним мог
  // заставить сервер прочитать в память 8 МБ и посчитать base64.
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

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
    target === "cycle-cover-2" ||
    target === "cycle-cover-3" ||
    target === "cycle-banner" ||
    target === "cycle-character-photo" ||
    target === "story-character-photo" ||
    target === "cycle-world-entry-photo" ||
    target === "story-world-entry-photo" ||
    target === "belief-photo" ||
    target === "storycircle-photo" ||
    target === "setting-photo" ||
    target === "cycle-setting-photo" ||
    target === "story-setting-photo" ||
    target === "avatar";
  const sizeLimit = isImage ? MAX_IMAGE_SIZE : MAX_SIZE;
  if (file.size > sizeLimit) {
    const mb = sizeLimit / (1024 * 1024);
    return Response.json({ error: `Файл слишком большой (максимум ${mb} МБ)` }, { status: 413 });
  }

  let buf = Buffer.from(await file.arrayBuffer());

  let mime = resolveStoredMime(file.type || "", buf, isImage);
  if (mime === null) {
    return Response.json(
      { error: "Поддерживаются изображения PNG, JPEG, WebP и GIF" },
      { status: 415 }
    );
  }
  const fileName = safeFileName(file.name);
  if (isImage && mime !== "image/gif") {
    // Аватар едет с каждой страницей кабинета, обложка — с книгой.
    const maxEdge = target === "avatar" ? 512 : 1600;
    const shrunk = await shrinkImage(buf, mime, maxEdge);
    buf = Buffer.from(shrunk.buf);
    mime = shrunk.mime;
  }
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  if (target === "material") {
    const material = await prisma.material.findUniqueOrThrow({ where: { id } });
    await requireMentor(material.studentId);
    const data =
      field === "pdf"
        ? { pdfUrl: dataUrl, pdfName: fileName }
        : field === "epub"
          ? { epubUrl: dataUrl, epubName: fileName }
          : { fileUrl: dataUrl, fileName: fileName };
    await prisma.material.update({ where: { id }, data });
  } else if (target === "guide") {
    await requireMentorSession();
    if (!(await guidesSchemaReady())) {
      return Response.json({ error: "Библиотека методичек ещё не подключена к базе" }, { status: 503 });
    }
    const guide = await prisma.guide.findUnique({ where: { id }, select: { id: true } });
    if (!guide) return Response.json({ error: "Методичка не найдена" }, { status: 404 });
    await prisma.guide.update({
      where: { id },
      data: { fileUrl: dataUrl, fileName, fileMime: mime },
    });
    return Response.json({ ok: true, fileName, mime });
  } else if (target === "draft") {
    const draft = await prisma.draft.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(draft.studentId);
    await prisma.draft.update({ where: { id }, data: { fileName: fileName, fileData: dataUrl } });
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
  } else if (target === "cycle-cover-2") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { coverUrl2: dataUrl } });
  } else if (target === "cycle-cover-3") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { coverUrl3: dataUrl } });
  } else if (target === "cycle-banner") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { bannerUrl: dataUrl } });
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

  return Response.json({ ok: true, fileName: fileName, dataUrl });
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
  "cycle-cover-2",
  "cycle-cover-3",
  "cycle-banner",
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
  try {
    return await handleDelete(req);
  } catch (e) {
    if (e instanceof AccessDeniedError) {
      return Response.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }
}

async function handleDelete(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

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
  } else if (target === "cycle-cover-2") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { coverUrl2: null } });
  } else if (target === "cycle-cover-3") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { coverUrl3: null } });
  } else if (target === "cycle-banner") {
    const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(cycle.studentId);
    await prisma.cycle.update({ where: { id }, data: { bannerUrl: null } });
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
