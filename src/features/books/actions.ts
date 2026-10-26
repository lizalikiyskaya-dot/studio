"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import type { SynopsisMode } from "@/generated/prisma/client";
import { awardStars } from "@/features/stars/award";
import { chapterAwardsStars } from "@/features/stars/rules";
import { creditStreakWeek } from "@/features/streak/credit";
import { submittedStatusCounts } from "@/features/streak/weeks";
import { isChapterReview, type ChapterReviewValue } from "./chapterReview";

async function attachAct(bookId: string, actId?: string | null) {
  if (actId) {
    const act = await prisma.act.findFirst({ where: { id: actId, bookId } });
    if (act) return { id: act.id, created: null as null | { id: string; title: string; order: number } };
  }
  const last = await prisma.act.findFirst({ where: { bookId }, orderBy: { order: "desc" } });
  if (last) return { id: last.id, created: null as null | { id: string; title: string; order: number } };
  const created = await prisma.act.create({ data: { bookId, order: 0, title: "Акт 1" } });
  return { id: created.id, created: { id: created.id, title: created.title, order: created.order } };
}

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

export async function createPlanChapter(bookId: string, actId?: string | null) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  const act = await attachAct(bookId, actId);
  const count = await prisma.planChapter.count({ where: { bookId } });
  const chapter = await prisma.planChapter.create({
    data: {
      bookId,
      order: count,
      actId: act.id,
      title: `Глава ${count + 1}`,
    },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  return { chapter, act: act.created };
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

export async function updatePlanChapterReview(chapterId: string, status: ChapterReviewValue) {
  if (!isChapterReview(status)) return;
  const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id: chapterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: chapter.bookId } });
  await requireMentor(book.studentId);
  if (chapter.reviewStatus === status) return;
  await prisma.planChapter.update({ where: { id: chapterId }, data: { reviewStatus: status } });
  if (chapterAwardsStars(status)) await awardStars(book.studentId, "CHAPTER", chapter.id);
  if (submittedStatusCounts(chapter.reviewStatus, status)) await creditStreakWeek(book.studentId);
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
  const [chapters, acts] = await Promise.all([
    prisma.planChapter.findMany({ where: { bookId: book.id }, orderBy: { order: "asc" } }),
    prisma.act.findMany({ where: { bookId: book.id }, orderBy: { order: "asc" } }),
  ]);
  const current = acts.find((act) => act.id === chapter.actId);

  if (value) {
    const later = chapters.filter((item) => item.order > chapter.order && item.actId === chapter.actId);
    const order = (current?.order ?? acts.length - 1) + 1;
    await prisma.$transaction(async (tx) => {
      await tx.act.updateMany({
        where: { bookId: book.id, order: { gte: order } },
        data: { order: { increment: 1 } },
      });
      const act = await tx.act.create({
        data: { bookId: book.id, order, title: `Акт ${acts.length + 1}` },
      });
      if (later.length > 0) {
        await tx.planChapter.updateMany({
          where: { id: { in: later.map((item) => item.id) } },
          data: { actId: act.id },
        });
      }
      await tx.planChapter.update({ where: { id: chapter.id }, data: { actBreakAfter: true } });
    });
  } else {
    const next = acts.find((act) => current && act.order > current.order);
    await prisma.$transaction(async (tx) => {
      await tx.planChapter.update({ where: { id: chapter.id }, data: { actBreakAfter: false } });
      if (next && chapter.actId) {
        await tx.planChapter.updateMany({ where: { actId: next.id }, data: { actId: chapter.actId } });
      }
    });
  }

  const [nextChapters, nextActs] = await Promise.all([
    prisma.planChapter.findMany({ where: { bookId: book.id }, orderBy: { order: "asc" } }),
    prisma.act.findMany({
      where: { bookId: book.id },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true, subtitle: true, content: true, status: true },
    }),
  ]);
  return { chapters: nextChapters, acts: nextActs };
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

export async function deletePlanChapter(chapterId: string) {
  const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id: chapterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: chapter.bookId } });
  await requireCabinetAccess(book.studentId);
  await prisma.planChapter.delete({ where: { id: chapterId } });
}
