"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { ALL_CHARACTER_FIELD_KEYS, type CharacterFieldKey } from "@/features/characters/fields";
import type { ArcType } from "@/generated/prisma/client";

// --- Cycle-level (shared) characters ---

export async function createCycleCharacter(cycleId: string) {
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);
  const count = await prisma.cycleCharacter.count({ where: { cycleId } });
  return prisma.cycleCharacter.create({
    data: { cycleId, order: count, name: "Новый персонаж" },
  });
}

export async function deleteCycleCharacter(characterId: string) {
  const character = await prisma.cycleCharacter.findUniqueOrThrow({ where: { id: characterId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: character.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycleCharacter.delete({ where: { id: characterId } });
}

export async function updateCycleCharacterName(characterId: string, name: string) {
  const character = await prisma.cycleCharacter.findUniqueOrThrow({ where: { id: characterId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: character.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycleCharacter.update({ where: { id: characterId }, data: { name } });
}

export async function updateCycleCharacterArcType(characterId: string, arcType: ArcType) {
  const character = await prisma.cycleCharacter.findUniqueOrThrow({ where: { id: characterId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: character.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycleCharacter.update({ where: { id: characterId }, data: { arcType } });
}

export async function updateCycleCharacterField(
  characterId: string,
  field: CharacterFieldKey,
  value: string
) {
  if (!ALL_CHARACTER_FIELD_KEYS.includes(field)) throw new Error("Недопустимое поле");
  const character = await prisma.cycleCharacter.findUniqueOrThrow({ where: { id: characterId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: character.cycleId } });
  await requireCabinetAccess(cycle.studentId);

  const data = (character.data as Record<string, string>) ?? {};
  data[field] = value;
  await prisma.cycleCharacter.update({ where: { id: characterId }, data: { data } });
}

export async function reorderCycleCharacters(cycleId: string, orderedIds: string[]) {
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.cycleCharacter.update({ where: { id }, data: { order: index } }))
  );
}

// --- Story-level (own) characters ---

export async function createStoryCharacter(storyId: string) {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  const count = await prisma.storyCharacter.count({ where: { storyId } });
  return prisma.storyCharacter.create({
    data: { storyId, order: count, name: "Новый персонаж" },
  });
}

export async function deleteStoryCharacter(characterId: string) {
  const character = await prisma.storyCharacter.findUniqueOrThrow({ where: { id: characterId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: character.storyId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.storyCharacter.delete({ where: { id: characterId } });
}

export async function updateStoryCharacterName(characterId: string, name: string) {
  const character = await prisma.storyCharacter.findUniqueOrThrow({ where: { id: characterId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: character.storyId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.storyCharacter.update({ where: { id: characterId }, data: { name } });
}

export async function updateStoryCharacterArcType(characterId: string, arcType: ArcType) {
  const character = await prisma.storyCharacter.findUniqueOrThrow({ where: { id: characterId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: character.storyId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.storyCharacter.update({ where: { id: characterId }, data: { arcType } });
}

export async function updateStoryCharacterField(
  characterId: string,
  field: CharacterFieldKey,
  value: string
) {
  if (!ALL_CHARACTER_FIELD_KEYS.includes(field)) throw new Error("Недопустимое поле");
  const character = await prisma.storyCharacter.findUniqueOrThrow({ where: { id: characterId } });
  const story = await prisma.story.findUniqueOrThrow({ where: { id: character.storyId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);

  const data = (character.data as Record<string, string>) ?? {};
  data[field] = value;
  await prisma.storyCharacter.update({ where: { id: characterId }, data: { data } });
}

export async function reorderStoryCharacters(storyId: string, orderedIds: string[]) {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: story.cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.storyCharacter.update({ where: { id }, data: { order: index } }))
  );
}
