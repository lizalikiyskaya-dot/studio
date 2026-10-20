"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import type { WorldCategory } from "@/generated/prisma/client";
import { resolveShares } from "./settingMix";
import { isEntryCategory } from "./worldBible";

const GRAPES_FIELDS = [
  "grapesGeography",
  "grapesReligion",
  "grapesAchievements",
  "grapesPolitics",
  "grapesEconomy",
  "grapesSocial",
] as const;

export type GrapesField = (typeof GRAPES_FIELDS)[number];

export async function updateGrapesField(bookId: string, field: GrapesField, value: string) {
  if (!GRAPES_FIELDS.includes(field)) throw new Error("Недопустимое поле");
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.book.update({ where: { id: bookId }, data: { [field]: value } });
}

// Кнопка «добавить сеттинг»: ещё одна таблица GRAPES под основной.
export async function createGrapesSetting(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  const count = await prisma.grapesSetting.count({ where: { bookId } });
  return prisma.grapesSetting.create({ data: { bookId, order: count } });
}

export async function deleteGrapesSetting(settingId: string) {
  const setting = await prisma.grapesSetting.findUniqueOrThrow({ where: { id: settingId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: setting.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.grapesSetting.delete({ where: { id: settingId } });
  await prisma.fieldSuggestion.deleteMany({ where: { model: "GrapesSetting", recordId: settingId } });
}

const SETTING_TYPE_CHIPS = ["Магнит", "Манифест", "Фильтр"] as const;

export async function toggleSettingChip(bookId: string, chip: string) {
  if (!SETTING_TYPE_CHIPS.includes(chip as (typeof SETTING_TYPE_CHIPS)[number])) {
    throw new Error("Недопустимый чип");
  }
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);

  const current = book.settingChips;
  const next = current.includes(chip)
    ? current.filter((c) => c !== chip)
    : [...current, chip];

  await prisma.book.update({ where: { id: bookId }, data: { settingChips: next } });
  return next;
}

export async function updateBookSettingMap(bookId: string, x: number, y: number) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.book.update({ where: { id: bookId }, data: { settingMapX: x, settingMapY: y } });
}

export async function saveSettingMix(
  bookId: string,
  shares: { manifest: number; filter: number; conflict: number; magnet: number }
) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  const session = await requireCabinetAccess(book.studentId);
  const clean = {
    manifest: clampMix(shares.manifest),
    filter: clampMix(shares.filter),
    conflict: clampMix(shares.conflict),
    magnet: clampMix(shares.magnet),
  };

  if (session.role === "MENTOR") {
    const student = await prisma.user.findUniqueOrThrow({ where: { id: book.studentId } });
    const current = resolveShares(book);
    const filled = current.manifest + current.filter + current.conflict + current.magnet > 0;
    // Пустой сеттинг наставник заполняет сразу. Если доли уже есть — это правка.
    if (student.reviewModeEnabled && filled) {
      const value = JSON.stringify(clean);
      await prisma.fieldSuggestion.upsert({
        where: { model_recordId_field: { model: "Book", recordId: bookId, field: "settingMix" } },
        update: { value },
        create: { model: "Book", recordId: bookId, field: "settingMix", value },
      });
      return { suggested: true as const };
    }
  }

  await prisma.book.update({
    where: { id: bookId },
    data: {
      settingManifest: clean.manifest,
      settingFilter: clean.filter,
      settingConflict: clean.conflict,
      settingMagnet: clean.magnet,
    },
  });
  await prisma.fieldSuggestion.deleteMany({ where: { model: "Book", recordId: bookId, field: "settingMix" } });
  return { suggested: false as const };
}

export async function acceptSettingMix(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  const suggestion = await prisma.fieldSuggestion.findUnique({
    where: { model_recordId_field: { model: "Book", recordId: bookId, field: "settingMix" } },
  });
  if (!suggestion) return;
  const data = JSON.parse(suggestion.value) as { manifest: number; filter: number; conflict: number; magnet: number };
  await prisma.book.update({
    where: { id: bookId },
    data: {
      settingManifest: clampMix(data.manifest),
      settingFilter: clampMix(data.filter),
      settingConflict: clampMix(data.conflict),
      settingMagnet: clampMix(data.magnet),
    },
  });
  await prisma.fieldSuggestion.delete({ where: { id: suggestion.id } });
}

export async function rejectSettingMix(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.fieldSuggestion.deleteMany({ where: { model: "Book", recordId: bookId, field: "settingMix" } });
}

function clampMix(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function toggleFantasyLock(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireMentor(book.studentId);
  await prisma.book.update({ where: { id: bookId }, data: { fantasyUnlocked: !book.fantasyUnlocked } });
  return !book.fantasyUnlocked;
}

const FANTASY_TEXT_FIELDS = ["fantasyNotes", "fantasyGeneral"] as const;
export type FantasyTextField = (typeof FANTASY_TEXT_FIELDS)[number];

export async function updateFantasyText(bookId: string, field: FantasyTextField, value: string) {
  if (!FANTASY_TEXT_FIELDS.includes(field)) throw new Error("Недопустимое поле");
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.book.update({ where: { id: bookId }, data: { [field]: value } });
}

export async function createWorldEntry(bookId: string, category: WorldCategory) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  const count = await prisma.worldEntry.count({ where: { bookId, category } });
  return prisma.worldEntry.create({
    data: { bookId, category, order: count },
  });
}

export async function deleteWorldEntry(entryId: string) {
  const entry = await prisma.worldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: entry.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.worldEntry.delete({ where: { id: entryId } });
}

export async function updateWorldEntryTitle(entryId: string, title: string) {
  const entry = await prisma.worldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: entry.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.worldEntry.update({ where: { id: entryId }, data: { title } });
}

export async function updateWorldEntryBody(entryId: string, body: string) {
  const entry = await prisma.worldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: entry.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.worldEntry.update({ where: { id: entryId }, data: { body } });
}

export async function updateWorldEntryCategory(entryId: string, category: WorldCategory) {
  if (!isEntryCategory(category)) throw new Error("Недопустимая тема");
  const entry = await prisma.worldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: entry.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.worldEntry.update({ where: { id: entryId }, data: { category } });
}

