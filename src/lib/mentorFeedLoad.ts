import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { sectionLabel } from "@/lib/sections";
import { buildFeed, type FeedDraft, type FeedItem, type SeenMark } from "@/lib/mentorFeed";

const SPECIFIC = new Set(["exercises", "weekly", "tasks"]);

export const loadMentorFeed = cache(async (mentorId: string): Promise<FeedItem[]> => {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", status: { in: ["APPROVED", "SUSPENDED"] } },
    select: { id: true, name: true },
  });
  if (students.length === 0) return [];
  const ids = students.map((student) => student.id);
  const nameById = new Map(students.map((student) => [student.id, student.name]));

  const [tasks, chapters, weekly, activity, seen] = await Promise.all([
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

  const marks: SeenMark[] = seen.map((row) => ({
    kind: row.kind,
    sourceId: row.sourceId,
    seenAt: row.seenAt.toISOString(),
  }));
  return buildFeed(drafts, marks);
});
