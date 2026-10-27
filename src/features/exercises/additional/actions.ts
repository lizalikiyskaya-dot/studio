"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, AccessDeniedError } from "@/lib/access";
import type { FreeSection, FreeSectionType, TaskStatus } from "@/generated/prisma/client";
import { isTaskStatus } from "@/features/tasks/status";
import { creditStreakWeek } from "@/features/streak/credit";
import { submittedStatusCounts } from "@/features/streak/weeks";
import { mentorSubmissionUrl, notifyMentorOfSubmission } from "@/lib/submissionMail";
import { queueCabinetChange } from "@/lib/activityDigest";
import { queueMentorDigest, reviewGroup, studentExerciseUrl } from "@/lib/mentorDigest";
import type { ContentFormat } from "./richText";

export async function createAdditionalSection(
  studentId: string,
  type: FreeSectionType,
  rows?: number,
  cols?: number
) {
  // Карточки заводят и наставник, и сам ученик.
  const session = await requireCabinetAccess(studentId);
  const count = await prisma.freeSection.count({ where: { studentId } });
  const tableData =
    type === "TABLE"
      ? Array.from({ length: rows ?? 2 }, () => Array.from({ length: cols ?? 2 }, () => ""))
      : undefined;
  return prisma.freeSection.create({
    data: {
      studentId,
      order: count,
      type,
      title: type === "TABLE" ? "Новая таблица" : "Новый вопрос",
      tableData,
      createdByStudent: session.role === "STUDENT",
    },
  });
}

/**
 * Переименовать и удалить карточку может наставник — любую, ученик —
 * только ту, что завёл сам. Вопросы наставника остаются неприкосновенны.
 */
async function requireSectionOwner(section: FreeSection) {
  const session = await requireCabinetAccess(section.studentId);
  if (session.role !== "MENTOR" && !section.createdByStudent) {
    throw new AccessDeniedError("Эту карточку добавил наставник");
  }
  return session;
}

export async function updateSectionTitle(sectionId: string, title: string) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireSectionOwner(section);
  await prisma.freeSection.update({ where: { id: sectionId }, data: { title } });
}

export async function updateSectionContent(sectionId: string, content: string) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireCabinetAccess(section.studentId);
  await prisma.freeSection.update({ where: { id: sectionId }, data: { content } });
}

function asFormat(format: string): ContentFormat {
  return format === "markdown" ? "markdown" : "plain";
}

/** Пишет текст и его формат. В режиме правок наставника это предложение, не замена. */
export async function saveSectionBody(sectionId: string, content: string, format: ContentFormat) {
  if (content.length > 200_000) throw new Error("Текст слишком длинный. Сократите его.");
  const safeFormat = asFormat(format);
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  const session = await requireCabinetAccess(section.studentId);
  const student = await prisma.user.findUniqueOrThrow({
    where: { id: section.studentId },
    select: { reviewModeEnabled: true },
  });
  const suggest =
    session.role === "MENTOR" &&
    student.reviewModeEnabled &&
    section.content.trim().length > 0 &&
    content !== section.content;

  if (!suggest) {
    if (content !== section.content || safeFormat !== section.contentFormat) {
      await prisma.freeSection.update({
        where: { id: sectionId },
        data: { content, contentFormat: safeFormat },
      });
      if (session.role === "MENTOR") {
        await queueMentorDigest({
          studentId: section.studentId,
          group: "text",
          sourceId: `FreeSection:${section.id}`,
          title: section.title.trim() ? `Дополнительно: ${section.title.trim()}` : "Дополнительно",
          url: studentExerciseUrl("extra", section.id),
        });
      } else {
        await queueCabinetChange({
          studentId: section.studentId,
          byMentor: false,
          section: "exercises",
          detail: "Правка",
        });
      }
    }
    await prisma.fieldSuggestion.deleteMany({
      where: { model: "FreeSection", recordId: sectionId, field: { in: ["content", "contentFormat"] } },
    });
    return { suggested: false as const };
  }

  await prisma.fieldSuggestion.upsert({
    where: { model_recordId_field: { model: "FreeSection", recordId: sectionId, field: "content" } },
    update: { value: content },
    create: { model: "FreeSection", recordId: sectionId, field: "content", value: content },
  });
  await prisma.fieldSuggestion.upsert({
    where: { model_recordId_field: { model: "FreeSection", recordId: sectionId, field: "contentFormat" } },
    update: { value: safeFormat },
    create: { model: "FreeSection", recordId: sectionId, field: "contentFormat", value: safeFormat },
  });
  await queueMentorDigest({
    studentId: section.studentId,
    group: "text",
    sourceId: `FreeSection:${section.id}`,
    title: section.title.trim() ? `Дополнительно: ${section.title.trim()}` : "Дополнительно",
    url: studentExerciseUrl("extra", section.id),
  });
  return { suggested: true as const };
}

export async function updateTableCell(sectionId: string, row: number, col: number, value: string) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireCabinetAccess(section.studentId);
  const grid = ((section.tableData as string[][]) ?? []).map((r) => [...r]);
  if (grid[row]) grid[row][col] = value;
  await prisma.freeSection.update({ where: { id: sectionId }, data: { tableData: grid } });
}

export async function resizeTable(sectionId: string, rows: number, cols: number) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireCabinetAccess(section.studentId);
  const current = (section.tableData as string[][]) ?? [];
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => current[r]?.[c] ?? "")
  );
  await prisma.freeSection.update({ where: { id: sectionId }, data: { tableData: grid } });
  return grid;
}

export async function deleteAdditionalSection(sectionId: string) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireSectionOwner(section);
  await prisma.freeSection.delete({ where: { id: sectionId } });
}

export async function setSectionStatus(sectionId: string, status: TaskStatus) {
  if (!isTaskStatus(status)) return null;
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  const session = await requireCabinetAccess(section.studentId);
  if (session.role !== "MENTOR" && status !== "SUBMITTED") return section.status;
  if (section.status === status) return status;
  await prisma.freeSection.update({ where: { id: sectionId }, data: { status } });
  const review = session.role === "MENTOR" ? reviewGroup(status) : null;
  if (review) {
    await queueMentorDigest({
      studentId: section.studentId,
      group: review,
      sourceId: `extra:${section.id}`,
      title: section.title,
      url: studentExerciseUrl("extra", section.id),
    });
  }
  if (submittedStatusCounts(section.status, status)) {
    await creditStreakWeek(section.studentId);
    await notifyMentorOfSubmission({
      actorRole: session.role,
      previous: section.status,
      next: status,
      studentId: section.studentId,
      section: "Упражнения, дополнительно",
      title: section.title,
      url: mentorSubmissionUrl(section.studentId, "extra", section.id),
    });
  }
  return status;
}
