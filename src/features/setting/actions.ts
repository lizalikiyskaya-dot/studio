"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

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

export async function updateSettingPhoto(bookId: string, photoUrl: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.book.update({ where: { id: bookId }, data: { settingPhotoUrl: photoUrl } });
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
