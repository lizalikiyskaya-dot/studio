"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import type { WorldCategory } from "@/generated/prisma/client";

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
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  const count = await prisma.storyWorldEntry.count({ where: { storyId, category } });
  return prisma.storyWorldEntry.create({
    data: { storyId, category, order: count },
  });
}

export async function deleteStoryWorldEntry(entryId: string) {
  const entry = await prisma.storyWorldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: entry.storyId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.storyWorldEntry.delete({ where: { id: entryId } });
}

export async function updateStoryWorldEntryTitle(entryId: string, title: string) {
  const entry = await prisma.storyWorldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: entry.storyId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.storyWorldEntry.update({ where: { id: entryId }, data: { title } });
}

export async function updateStoryWorldEntryBody(entryId: string, body: string) {
  const entry = await prisma.storyWorldEntry.findUniqueOrThrow({ where: { id: entryId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: entry.storyId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.storyWorldEntry.update({ where: { id: entryId }, data: { body } });
}
