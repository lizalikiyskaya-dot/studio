import { prisma } from "@/lib/prisma";
import { pickRecentEdits, type RecentEdit } from "@/lib/recentEdits";

export type RecentEditRow = {
  studentId: string;
  section: string;
  at: Date;
};

/**
 * Карточка «Последние правки».
 *
 * SectionActivity одна на ученика и раздел и обновляется только от input/change
 * в списке разделов сайдбара. Сдача кнопкой, задание недели, заметки и просто
 * заход в действие туда часто не попадают, а take: 6 ещё и выкидывает ученика,
 * если шесть чужих старых разделов новее его строки.
 *
 * Здесь время берётся из самой правки: сдача задания (Task.updatedAt при
 * «сдано на проверку»), сдача недели, заметка ученика, отметка раздела и
 * lastActivityAt, если конкретнее ничего нет.
 */
export async function loadRecentStudentEdits(
  students: { id: string; lastActivityAt: Date | null }[],
): Promise<RecentEditRow[]> {
  const ids = students.map((student) => student.id);
  if (ids.length === 0) return [];

  const [sections, weekly, notes, tasks] = await Promise.all([
    prisma.sectionActivity.findMany({
      where: { studentId: { in: ids }, byRole: "STUDENT" },
      select: { studentId: true, section: true, at: true },
    }),
    prisma.weeklySubmission.findMany({
      where: { studentId: { in: ids } },
      select: { studentId: true, updatedAt: true },
    }),
    prisma.note.findMany({
      where: { studentId: { in: ids }, authorRole: "STUDENT" },
      select: { studentId: true, updatedAt: true },
    }),
    prisma.task.findMany({
      where: { studentId: { in: ids }, status: "SUBMITTED" },
      select: { studentId: true, updatedAt: true },
    }),
  ]);

  const events: RecentEdit[] = [];
  const push = (studentId: string, section: string, at: Date) => {
    events.push({ studentId, section, at: at.toISOString() });
  };
  for (const row of sections) push(row.studentId, row.section, row.at);
  for (const row of weekly) push(row.studentId, "weekly", row.updatedAt);
  for (const row of notes) push(row.studentId, "notes", row.updatedAt);
  for (const row of tasks) push(row.studentId, "tasks", row.updatedAt);
  for (const student of students) {
    if (student.lastActivityAt) push(student.id, "cabinet", student.lastActivityAt);
  }

  return pickRecentEdits(events).map((row) => ({
    studentId: row.studentId,
    section: row.section,
    at: new Date(row.at),
  }));
}
