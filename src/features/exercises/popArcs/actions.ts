"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { ALL_CHARACTER_FIELD_KEYS } from "@/features/characters/fields";

export async function createPopArcCharacter(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.popArcCharacter.count({ where: { studentId } });
  return prisma.popArcCharacter.create({
    data: { studentId, order: count, name: "Новый герой" },
  });
}

export async function deletePopArcCharacter(id: string) {
  const character = await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(character.studentId);
  await prisma.popArcCharacter.delete({ where: { id } });
}

export async function updatePopArcName(id: string, name: string) {
  const character = await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(character.studentId);
  await prisma.popArcCharacter.update({ where: { id }, data: { name } });
}

export async function updatePopArcPhoto(id: string, photoUrl: string) {
  const character = await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(character.studentId);
  await prisma.popArcCharacter.update({ where: { id }, data: { photoUrl } });
}

export async function updatePopArcField(id: string, field: string, value: string) {
  if (!ALL_CHARACTER_FIELD_KEYS.includes(field as never)) throw new Error("Недопустимое поле");
  const character = await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(character.studentId);
  const data = (character.data as Record<string, string>) ?? {};
  data[field] = value;
  await prisma.popArcCharacter.update({ where: { id }, data: { data } });
}
