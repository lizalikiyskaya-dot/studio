"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import type { WorldCategory } from "@/generated/prisma/client";

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

