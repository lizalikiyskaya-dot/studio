"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { ALL_CHARACTER_FIELD_KEYS, type CharacterFieldKey } from "./fields";
import type { ArcType } from "@/generated/prisma/client";

export async function updateCharacterArcType(characterId: string, arcType: ArcType) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: character.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.character.update({ where: { id: characterId }, data: { arcType } });
}

export async function createCharacter(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  const count = await prisma.character.count({ where: { bookId } });
  return prisma.character.create({
    data: { bookId, order: count, name: "Новый персонаж" },
  });
}

export async function deleteCharacter(characterId: string) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: character.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.character.delete({ where: { id: characterId } });
}

export async function updateCharacterName(characterId: string, name: string) {
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: character.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.character.update({ where: { id: characterId }, data: { name } });
}

export async function updateCharacterField(
  characterId: string,
  field: CharacterFieldKey,
  value: string
) {
  if (!ALL_CHARACTER_FIELD_KEYS.includes(field)) throw new Error("Недопустимое поле");
  const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: character.bookId } });
  await requireCabinetAccess(book.studentId);

  const data = (character.data as Record<string, string>) ?? {};
  data[field] = value;
  await prisma.character.update({ where: { id: characterId }, data: { data } });
}
