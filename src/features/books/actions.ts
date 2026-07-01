"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import type { SynopsisMode } from "@/generated/prisma/client";

export async function createBook(studentId: string) {
  await requireCabinetAccess(studentId);
  const book = await prisma.book.create({
    data: { studentId, title: "Новая книга" },
  });
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/student-view/${studentId}`, "layout");
  return book;
}

export async function deleteBook(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.book.delete({ where: { id: bookId } });
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/student-view/${book.studentId}`, "layout");
}

export async function updateSynopsisMode(bookId: string, mode: SynopsisMode) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.book.update({ where: { id: bookId }, data: { synopsisMode: mode } });
}

export async function createPlanChapter(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  const count = await prisma.planChapter.count({ where: { bookId } });
  const chapter = await prisma.planChapter.create({
    data: { bookId, order: count },
  });
  return chapter;
}

export async function updatePlanChapterText(
  chapterId: string,
  field: "summary" | "dramaticArgument" | "images" | "note",
  value: string
) {
  const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id: chapterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: chapter.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.planChapter.update({ where: { id: chapterId }, data: { [field]: value } });
}

export async function updatePlanChapterNumber(
  chapterId: string,
  field: "plannedChars" | "writtenChars",
  value: number
) {
  const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id: chapterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: chapter.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.planChapter.update({
    where: { id: chapterId },
    data: { [field]: Math.max(0, Math.round(value)) },
  });
}

export async function updatePlanChapterColor(chapterId: string, color: string | null) {
  const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id: chapterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: chapter.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.planChapter.update({ where: { id: chapterId }, data: { color } });
}

export async function updatePlanColumnColors(bookId: string, colors: Record<string, string | null>) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.book.update({ where: { id: bookId }, data: { planColumnColors: colors } });
}

export async function toggleChapterActBreak(chapterId: string, value: boolean) {
  const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id: chapterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: chapter.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.planChapter.update({ where: { id: chapterId }, data: { actBreakAfter: value } });
}

export async function updateBookPhotoPosition(
  bookId: string,
  field: "coverPosition" | "coverPosition2" | "coverPosition3" | "bannerPosition",
  position: string
) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.book.update({ where: { id: bookId }, data: { [field]: position } });
}
