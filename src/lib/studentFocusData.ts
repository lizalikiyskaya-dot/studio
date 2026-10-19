import { prisma } from "@/lib/prisma";
import {
  currentWorkLabel,
  nearestDeadlineViews,
  nearestPaymentViews,
  type FocusSource,
  type NearestDeadlineView,
  type NearestPaymentView,
} from "@/lib/studentFocus";

export async function loadCurrentWork(studentIds: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  if (studentIds.length === 0) return result;

  const [tasks, chapters, stories, books] = await Promise.all([
    prisma.task.findMany({
      where: { studentId: { in: studentIds }, status: "IN_PROGRESS" },
      select: { studentId: true, title: true, deadline: true, order: true, updatedAt: true },
    }),
    prisma.planChapter.findMany({
      where: { book: { studentId: { in: studentIds } } },
      select: {
        title: true,
        order: true,
        writtenChars: true,
        plannedChars: true,
        book: { select: { studentId: true, createdAt: true } },
      },
    }),
    prisma.story.findMany({
      where: { studentId: { in: studentIds } },
      select: {
        studentId: true,
        title: true,
        order: true,
        logline: true,
        concept: true,
        setupText: true,
        climaxText: true,
        resolutionText: true,
      },
    }),
    prisma.book.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, title: true, logline: true, concept: true, synopsisText: true, createdAt: true },
    }),
  ]);

  const byStudent = new Map<string, FocusSource>();
  for (const id of studentIds) {
    byStudent.set(id, { tasks: [], chapters: [], stories: [], books: [] });
  }
  for (const task of tasks) {
    byStudent.get(task.studentId)?.tasks.push(task);
  }
  for (const chapter of chapters) {
    byStudent.get(chapter.book.studentId)?.chapters.push({
      title: chapter.title,
      order: chapter.order,
      writtenChars: chapter.writtenChars,
      plannedChars: chapter.plannedChars,
      bookCreatedAt: chapter.book.createdAt,
    });
  }
  for (const story of stories) {
    const started = [story.logline, story.concept, story.setupText, story.climaxText, story.resolutionText].some(
      (value) => value.trim(),
    );
    byStudent.get(story.studentId)?.stories.push({ title: story.title, order: story.order, started });
  }
  for (const book of books) {
    const started = [book.logline, book.concept, book.synopsisText].some((value) => value.trim());
    byStudent.get(book.studentId)?.books.push({
      title: book.title,
      createdAt: book.createdAt,
      started,
    });
  }

  for (const id of studentIds) {
    result[id] = currentWorkLabel(byStudent.get(id)!);
  }
  return result;
}

export async function loadMentorNearest(now = new Date()): Promise<{
  deadlines: NearestDeadlineView[];
  payments: NearestPaymentView[];
}> {
  const [tasks, people] = await Promise.all([
    prisma.task.findMany({
      where: {
        deadline: { not: null },
        status: { not: "ACCEPTED" },
        student: { role: "STUDENT", status: { in: ["APPROVED", "SUSPENDED"] } },
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        status: true,
        student: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "STUDENT",
        status: { in: ["APPROVED", "SUSPENDED"] },
        paymentDay: { not: null },
      },
      select: { id: true, name: true, paymentDay: true, paymentAmount: true },
    }),
  ]);

  return {
    deadlines: nearestDeadlineViews(
      tasks.flatMap((task) =>
        task.deadline
          ? [{
              id: task.id,
              studentId: task.student.id,
              student: task.student.name,
              title: task.title,
              deadline: task.deadline,
              status: task.status,
            }]
          : [],
      ),
      now,
    ),
    payments: nearestPaymentViews(
      people.flatMap((person) =>
        person.paymentDay == null
          ? []
          : [{ id: person.id, name: person.name, paymentDay: person.paymentDay, paymentAmount: person.paymentAmount }],
      ),
      now,
    ),
  };
}
