"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import type { WorldCategory } from "@/generated/prisma/client";

// --- Cycle-level GRAPES / setting type / fantasy world ---

const GRAPES_FIELDS = [
  "grapesGeography",
  "grapesReligion",
  "grapesAchievements",
  "grapesPolitics",
  "grapesEconomy",
  "grapesSocial",
] as const;

export type CycleGrapesField = (typeof GRAPES_FIELDS)[number];

export async function updateCycleGrapesField(cycleId: string, field: CycleGrapesField, value: string) {
  if (!GRAPES_FIELDS.includes(field)) throw new Error("Недопустимое поле");
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycle.update({ where: { id: cycleId }, data: { [field]: value } });
}

const SETTING_TYPE_CHIPS = ["Магнит", "Манифест", "Фильтр"] as const;

export async function toggleCycleSettingChip(cycleId: string, chip: string) {
  if (!SETTING_TYPE_CHIPS.includes(chip as (typeof SETTING_TYPE_CHIPS)[number])) {
    throw new Error("Недопустимый чип");
  }
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);

  const current = cycle.settingChips;
  const next = current.includes(chip) ? current.filter((c) => c !== chip) : [...current, chip];

  await prisma.cycle.update({ where: { id: cycleId }, data: { settingChips: next } });
  return next;
}

export async function toggleCycleFantasyLock(cycleId: string) {
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireMentor(cycle.studentId);
  await prisma.cycle.update({ where: { id: cycleId }, data: { fantasyUnlocked: !cycle.fantasyUnlocked } });
  return !cycle.fantasyUnlocked;
}

const FANTASY_TEXT_FIELDS = ["fantasyNotes", "fantasyGeneral"] as const;
export type CycleFantasyTextField = (typeof FANTASY_TEXT_FIELDS)[number];

export async function updateCycleFantasyText(cycleId: string, field: CycleFantasyTextField, value: string) {
  if (!FANTASY_TEXT_FIELDS.includes(field)) throw new Error("Недопустимое поле");
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycle.update({ where: { id: cycleId }, data: { [field]: value } });
}

// --- Cycle-level (shared) world entries ---

export async function createCycleWorldEntry(cycleId: string, category: WorldCategory) {
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);
  const count = await prisma.cycleWorldEntry.count({ where: { cycleId, category } });
  return prisma.cycleWorldEntry.create({
    data: { cycleId, category, order: count },
  });
}

export async function deleteCycleWorldEntry(entryId: string) {
  const entry = await prisma.cycleWorldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: entry.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycleWorldEntry.delete({ where: { id: entryId } });
}

export async function updateCycleWorldEntryTitle(entryId: string, title: string) {
  const entry = await prisma.cycleWorldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: entry.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycleWorldEntry.update({ where: { id: entryId }, data: { title } });
}

export async function updateCycleWorldEntryBody(entryId: string, body: string) {
  const entry = await prisma.cycleWorldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: entry.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycleWorldEntry.update({ where: { id: entryId }, data: { body } });
}

// --- Story-level (own) world entries ---

export async function createStoryWorldEntry(storyId: string, category: WorldCategory) {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  await requireCabinetAccess(story.studentId);
  const count = await prisma.storyWorldEntry.count({ where: { storyId, category } });
  return prisma.storyWorldEntry.create({
    data: { storyId, category, order: count },
  });
}

export async function deleteStoryWorldEntry(entryId: string) {
  const entry = await prisma.storyWorldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: entry.storyId } });
  await requireCabinetAccess(story.studentId);
  await prisma.storyWorldEntry.delete({ where: { id: entryId } });
}

export async function updateStoryWorldEntryTitle(entryId: string, title: string) {
  const entry = await prisma.storyWorldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: entry.storyId } });
  await requireCabinetAccess(story.studentId);
  await prisma.storyWorldEntry.update({ where: { id: entryId }, data: { title } });
}

export async function updateStoryWorldEntryBody(entryId: string, body: string) {
  const entry = await prisma.storyWorldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: entry.storyId } });
  await requireCabinetAccess(story.studentId);
  await prisma.storyWorldEntry.update({ where: { id: entryId }, data: { body } });
}
