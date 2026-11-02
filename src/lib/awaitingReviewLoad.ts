import { prisma } from "@/lib/prisma";
import { sortAwaiting, type AwaitingItem } from "@/lib/awaitingReview";

/** Сданное и ещё не принятое и не возвращённое. История ленты сюда не входит. */
export async function loadAwaitingReview(): Promise<AwaitingItem[]> {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", status: { in: ["APPROVED", "SUSPENDED"] } },
    select: { id: true, name: true },
  });
  if (students.length === 0) return [];
  const ids = students.map((student) => student.id);
  const nameById = new Map(students.map((student) => [student.id, student.name]));

  const [tasks, chapters, events, weekly] = await Promise.all([
    prisma.task.findMany({
      where: { studentId: { in: ids }, status: "SUBMITTED" },
      select: { id: true, studentId: true, title: true, updatedAt: true },
    }),
    prisma.planChapter.findMany({
      where: { reviewStatus: { in: ["SUBMITTED", "IN_REVIEW"] }, book: { studentId: { in: ids } } },
      select: { id: true, title: true, order: true, book: { select: { studentId: true } } },
    }),
    prisma.chapterFeedEvent.findMany({
      where: { studentId: { in: ids } },
      select: { chapterId: true, at: true, title: true },
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
  ]);

  const eventByChapter = new Map(events.map((event) => [event.chapterId, event]));
  const items: AwaitingItem[] = [];

  for (const task of tasks) {
    items.push({
      kind: "task",
      id: task.id,
      student: nameById.get(task.studentId) ?? "Ученик",
      title: task.title.trim() || "Без названия",
      at: task.updatedAt.toISOString(),
      href: `/student-view/${task.studentId}/tasks?tab=submitted#task-${task.id}`,
    });
  }

  for (const chapter of chapters) {
    const studentId = chapter.book.studentId;
    const event = eventByChapter.get(chapter.id);
    const name = chapter.title.trim();
    const numbered = name ? `Глава ${chapter.order + 1}, «${name}»` : `Глава ${chapter.order + 1}`;
    items.push({
      kind: "chapter",
      id: chapter.id,
      student: nameById.get(studentId) ?? "Ученик",
      title: event?.title.trim() || numbered,
      at: event?.at.toISOString() ?? null,
      href: `/student-view/${studentId}/plan#chapter-${chapter.id}`,
    });
  }

  for (const row of weekly) {
    items.push({
      kind: "weekly",
      id: row.id,
      student: nameById.get(row.studentId) ?? "Ученик",
      title: row.weeklyTask.title.trim() || "Задание недели",
      at: row.createdAt.toISOString(),
      href: `/student-view/${row.studentId}/weekly#weekly-${row.weeklyTaskId}`,
    });
  }

  return sortAwaiting(items);
}
