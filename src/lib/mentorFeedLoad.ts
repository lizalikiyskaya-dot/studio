import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { sectionLabel } from "@/lib/sections";
import { buildFeed, type FeedDraft, type FeedItem, type SeenMark } from "@/lib/mentorFeed";

const SPECIFIC = new Set(["exercises", "weekly", "tasks"]);

function missingDismissColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022" || code === "42P01" || message.includes("dismissedAt") || message.includes("MentorItemSeen");
}

async function loadDismissed(mentorId: string): Promise<{ kind: string; sourceId: string; dismissedAt: Date }[]> {
  try {
    return await prisma.$queryRaw<{ kind: string; sourceId: string; dismissedAt: Date }[]>`
      SELECT kind, "sourceId", "dismissedAt"
      FROM "MentorItemSeen"
      WHERE "userId" = ${mentorId} AND "dismissedAt" IS NOT NULL
    `;
  } catch (error) {
    if (missingDismissColumn(error)) return [];
    throw error;
  }
}

export const loadMentorFeed = cache(async (mentorId: string): Promise<FeedItem[]> => {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", status: { in: ["APPROVED", "SUSPENDED"] } },
    select: { id: true, name: true },
  });
  if (students.length === 0) return [];
  const ids = students.map((student) => student.id);
  const nameById = new Map(students.map((student) => [student.id, student.name]));

  const [tasks, chapters, weekly, activity, seen, dismissed] = await Promise.all([
    prisma.task.findMany({
      where: { studentId: { in: ids }, status: "SUBMITTED" },
      select: { id: true, studentId: true, title: true, updatedAt: true },
    }),
    prisma.chapterFeedEvent.findMany({
      where: { studentId: { in: ids } },
      select: { chapterId: true, studentId: true, title: true, at: true },
    }),
    prisma.weeklySubmission.findMany({
      where: { studentId: { in: ids } },
      select: {
        id: true,
        studentId: true,
        weeklyTaskId: true,
        createdAt: true,
        weeklyTask: { select: { title: true } },
      },
    }),
    prisma.sectionActivity.findMany({
      where: { studentId: { in: ids }, byRole: "STUDENT" },
      select: { studentId: true, section: true, at: true },
    }),
    prisma.mentorItemSeen.findMany({
      where: { userId: mentorId },
      select: { kind: true, sourceId: true, seenAt: true },
    }),
    loadDismissed(mentorId),
  ]);

  const submittedStudents = new Set(tasks.map((task) => task.studentId));
  const weeklyStudents = new Set(weekly.map((row) => row.studentId));
  const drafts: FeedDraft[] = [];

  for (const task of tasks) {
    drafts.push({
      kind: "task",
      sourceId: task.id,
      studentId: task.studentId,
      student: nameById.get(task.studentId) ?? "Ученик",
      needsAction: true,
      label: "Сдано основное задание",
      detail: task.title.trim(),
      at: task.updatedAt.toISOString(),
      href: `/student-view/${task.studentId}/tasks?tab=submitted#task-${task.id}`,
    });
  }
  for (const chapter of chapters) {
    drafts.push({
      kind: "chapter",
      sourceId: chapter.chapterId,
      studentId: chapter.studentId,
      student: nameById.get(chapter.studentId) ?? "Ученик",
      needsAction: true,
      label: "Сдана глава",
      detail: chapter.title.trim(),
      at: chapter.at.toISOString(),
      href: `/student-view/${chapter.studentId}/plan#chapter-${chapter.chapterId}`,
    });
  }
  for (const row of weekly) {
    drafts.push({
      kind: "weekly",
      sourceId: row.id,
      studentId: row.studentId,
      student: nameById.get(row.studentId) ?? "Ученик",
      needsAction: true,
      label: "Сдано задание недели",
      detail: row.weeklyTask.title.trim(),
      at: row.createdAt.toISOString(),
      href: `/student-view/${row.studentId}/weekly#weekly-${row.weeklyTaskId}`,
    });
  }
  for (const row of activity) {
    if (row.section === "exercises") {
      drafts.push({
        kind: "exercises",
        sourceId: row.studentId,
        studentId: row.studentId,
        student: nameById.get(row.studentId) ?? "Ученик",
        needsAction: false,
        label: "Правки в упражнениях",
        detail: "",
        at: row.at.toISOString(),
        href: `/student-view/${row.studentId}/exercises#exercises-page`,
      });
      continue;
    }
    if (row.section === "weekly" && weeklyStudents.has(row.studentId)) continue;
    if (row.section === "tasks" && submittedStudents.has(row.studentId)) continue;
    if (SPECIFIC.has(row.section) && row.section !== "tasks" && row.section !== "weekly") continue;
    drafts.push({
      kind: "section",
      sourceId: `${row.studentId}:${row.section}`,
      studentId: row.studentId,
      student: nameById.get(row.studentId) ?? "Ученик",
      needsAction: false,
      label: "Правка",
      detail: sectionLabel(row.section),
      at: row.at.toISOString(),
      href: `/student-view/${row.studentId}/${row.section}`,
    });
  }

  const hiddenAt = new Map(dismissed.map((row) => [`${row.kind}:${row.sourceId}`, row.dismissedAt.toISOString()]));
  const marks: SeenMark[] = seen.map((row) => ({
    kind: row.kind,
    sourceId: row.sourceId,
    seenAt: row.seenAt.toISOString(),
    dismissedAt: hiddenAt.get(`${row.kind}:${row.sourceId}`) ?? null,
  }));
  return buildFeed(drafts, marks);
});
