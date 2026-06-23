"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

export async function createAct(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  const count = await prisma.act.count({ where: { bookId } });
  return prisma.act.create({
    data: { bookId, order: count, title: `Акт ${count + 1}` },
  });
}

export async function updateActField(
  actId: string,
  field: "title" | "subtitle" | "content",
  value: string
) {
  const act = await prisma.act.findUniqueOrThrow({ where: { id: actId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: act.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.act.update({ where: { id: actId }, data: { [field]: value } });
}

export async function deleteAct(actId: string) {
  const act = await prisma.act.findUniqueOrThrow({ where: { id: actId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: act.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.act.delete({ where: { id: actId } });
}

export async function createStoryline(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  const count = await prisma.storyline.count({ where: { bookId } });
  return prisma.storyline.create({ data: { bookId, order: count } });
}

export async function updateStorylineField(
  storylineId: string,
  field: "name" | "chapters" | "status",
  value: string
) {
  const storyline = await prisma.storyline.findUniqueOrThrow({ where: { id: storylineId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: storyline.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.storyline.update({ where: { id: storylineId }, data: { [field]: value } });
}

export async function deleteStoryline(storylineId: string) {
  const storyline = await prisma.storyline.findUniqueOrThrow({ where: { id: storylineId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: storyline.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.storyline.delete({ where: { id: storylineId } });
}

const STORYLINE_COLORS = ["pink", "ochre", "blue", "lavender"] as const;
export type StorylineColor = (typeof STORYLINE_COLORS)[number];

export async function updateStorylineColor(storylineId: string, color: StorylineColor | null) {
  if (color !== null && !STORYLINE_COLORS.includes(color)) throw new Error("Недопустимый цвет");
  const storyline = await prisma.storyline.findUniqueOrThrow({ where: { id: storylineId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: storyline.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.storyline.update({ where: { id: storylineId }, data: { color } });
}
