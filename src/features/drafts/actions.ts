"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { creditStreakWeek } from "@/features/streak/credit";
import { linkAttachmentCounts } from "@/features/streak/weeks";
import { countSigns } from "./manuscriptCount";
import type { ContentFormat } from "@/features/exercises/additional/richText";
import { createPlanChapter } from "@/features/books/actions";
import { appUrl } from "@/lib/mail";
import { mentorTextLineTitle, queueMentorDigest } from "@/lib/mentorDigest";

function asFormat(value: string): ContentFormat {
  return value === "markdown" ? "markdown" : "plain";
}

export async function createDraft(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.draft.count({ where: { studentId } });
  return prisma.draft.create({ data: { studentId, order: count } });
}

export async function updateDraftField(
  draftId: string,
  field: "title" | "note" | "link",
  value: string
) {
  const draft = await prisma.draft.findUniqueOrThrow({ where: { id: draftId } });
  const session = await requireCabinetAccess(draft.studentId);
  const previous = draft[field] ?? "";
  if (previous === value) return;
  await prisma.draft.update({ where: { id: draftId }, data: { [field]: value } });
  if (field === "link" && linkAttachmentCounts(session, draft.studentId, previous, value)) {
    await creditStreakWeek(draft.studentId);
  }
}

export async function deleteDraft(draftId: string) {
  const draft = await prisma.draft.findUniqueOrThrow({ where: { id: draftId } });
  await requireCabinetAccess(draft.studentId);
  await prisma.draft.delete({ where: { id: draftId } });
}

async function chapterBook(chapterId: string) {
  const chapter = await prisma.planChapter.findUniqueOrThrow({ where: { id: chapterId } });
  const book = await prisma.book.findUniqueOrThrow({ where: { id: chapter.bookId } });
  const session = await requireCabinetAccess(book.studentId);
  return { chapter, book, session };
}

/** Наставник пишет в ту же главу, что и ученик. Письмо ученику собирается в общую пачку правок. */
async function noteMentorChapter(role: string, studentId: string, chapterId: string, title: string) {
  if (role !== "MENTOR") return;
  await queueMentorDigest({
    studentId,
    group: "text",
    sourceId: `PlanChapter:${chapterId}`,
    title: mentorTextLineTitle("PlanChapter", title),
    url: `${appUrl()}/dashboard/drafts`,
  });
}

export async function createManuscriptChapter(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  const session = await requireCabinetAccess(book.studentId);
  const { chapter } = await createPlanChapter(bookId);
  const saved = await prisma.planChapter.update({
    where: { id: chapter.id },
    data: { writtenHere: true, manuscript: "", manuscriptFormat: "plain", writtenChars: 0 },
  });
  await noteMentorChapter(session.role, book.studentId, saved.id, saved.title);
  return saved;
}

export async function saveManuscriptChapter(chapterId: string, content: string, format: ContentFormat) {
  const { chapter, book, session } = await chapterBook(chapterId);
  const stored = asFormat(format);
  const writtenChars = countSigns(content, stored);
  await prisma.planChapter.update({
    where: { id: chapterId },
    data: {
      manuscript: content,
      manuscriptFormat: stored,
      writtenHere: true,
      writtenChars,
    },
  });
  await noteMentorChapter(session.role, book.studentId, chapterId, chapter.title);
  return { writtenChars };
}

export async function renameManuscriptChapter(chapterId: string, title: string) {
  const { book, session } = await chapterBook(chapterId);
  const next = title.slice(0, 200);
  await prisma.planChapter.update({
    where: { id: chapterId },
    data: { title: next },
  });
  await noteMentorChapter(session.role, book.studentId, chapterId, next);
}

export async function reorderDrafts(studentId: string, ids: string[]) {
  await requireCabinetAccess(studentId);
  await Promise.all(ids.map((id, order) => prisma.draft.update({ where: { id }, data: { order } })));
}
