"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import { ALL_CHARACTER_FIELD_KEYS } from "@/features/characters/fields";
import type { ArcType } from "@/generated/prisma/client";

async function requireAccessForCharacter(id: string) {
  const character = await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } });
  if (character.isExample) {
    await requireMentor(character.studentId);
  } else {
    await requireCabinetAccess(character.studentId);
  }
  return character;
}

export async function createPopArcCharacter(studentId: string, isExample: boolean) {
  if (isExample) {
    await requireMentor(studentId);
  } else {
    await requireCabinetAccess(studentId);
  }
  const count = await prisma.popArcCharacter.count({ where: { studentId, isExample } });
  return prisma.popArcCharacter.create({
    data: { studentId, isExample, order: count, name: isExample ? "Новый пример" : "Новый герой" },
  });
}

export async function deletePopArcCharacter(id: string) {
  await requireAccessForCharacter(id);
  await prisma.popArcCharacter.delete({ where: { id } });
}

export async function updatePopArcName(id: string, name: string) {
  await requireAccessForCharacter(id);
  await prisma.popArcCharacter.update({ where: { id }, data: { name } });
}

export async function updatePopArcField(id: string, field: string, value: string) {
  if (!ALL_CHARACTER_FIELD_KEYS.includes(field as never)) throw new Error("Недопустимое поле");
  const character = await requireAccessForCharacter(id);
  const data = (character.data as Record<string, string>) ?? {};
  data[field] = value;
  await prisma.popArcCharacter.update({ where: { id }, data: { data } });
}

export async function updatePopArcType(id: string, arcType: ArcType) {
  await requireAccessForCharacter(id);
  await prisma.popArcCharacter.update({ where: { id }, data: { arcType } });
}
