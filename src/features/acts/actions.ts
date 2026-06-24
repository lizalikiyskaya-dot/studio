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

async function requireAccessForAct(actId: string) {
  const act = await prisma.act.findUniqueOrThrow({ where: { id: actId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: act.bookId } });
  await requireCabinetAccess(book.studentId);
}

async function requireAccessForChapter(chapterId: string) {
  const chapter = await prisma.actChapter.findUniqueOrThrow({ where: { id: chapterId } });
  await requireAccessForAct(chapter.actId);
  return chapter;
}

async function requireAccessForBlock(blockId: string) {
  const block = await prisma.storylineBlock.findUniqueOrThrow({ where: { id: blockId } });
  await requireAccessForChapter(block.chapterId);
  return block;
}

export async function createActChapter(actId: string) {
  await requireAccessForAct(actId);
  const count = await prisma.actChapter.count({ where: { actId } });
  return prisma.actChapter.create({
    data: { actId, order: count, title: `Глава ${count + 1}` },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
}

export async function updateActChapterField(
  chapterId: string,
  field: "title" | "description",
  value: string
) {
  await requireAccessForChapter(chapterId);
  await prisma.actChapter.update({ where: { id: chapterId }, data: { [field]: value } });
}

export async function deleteActChapter(chapterId: string) {
  await requireAccessForChapter(chapterId);
  await prisma.actChapter.delete({ where: { id: chapterId } });
}

const STORYLINE_COLORS = ["pink", "ochre", "blue", "lavender", "sage"] as const;
export type StorylineColor = (typeof STORYLINE_COLORS)[number];

export async function createStorylineBlock(chapterId: string) {
  await requireAccessForChapter(chapterId);
  const count = await prisma.storylineBlock.count({ where: { chapterId } });
  const color = STORYLINE_COLORS[count % STORYLINE_COLORS.length];
  return prisma.storylineBlock.create({
    data: { chapterId, order: count, color, name: "Новая линия" },
  });
}

export async function updateStorylineBlockField(
  blockId: string,
  field: "name" | "description",
  value: string
) {
  await requireAccessForBlock(blockId);
  await prisma.storylineBlock.update({ where: { id: blockId }, data: { [field]: value } });
}

export async function updateStorylineBlockColor(blockId: string, color: StorylineColor) {
  if (!STORYLINE_COLORS.includes(color)) throw new Error("Недопустимый цвет");
  await requireAccessForBlock(blockId);
  await prisma.storylineBlock.update({ where: { id: blockId }, data: { color } });
}

export async function deleteStorylineBlock(blockId: string) {
  await requireAccessForBlock(blockId);
  await prisma.storylineBlock.delete({ where: { id: blockId } });
}

export async function moveStorylineBlock(blockId: string, targetChapterId: string) {
  await requireAccessForBlock(blockId);
  await requireAccessForChapter(targetChapterId);
  const count = await prisma.storylineBlock.count({ where: { chapterId: targetChapterId } });
  await prisma.storylineBlock.update({
    where: { id: blockId },
    data: { chapterId: targetChapterId, order: count },
  });
}
