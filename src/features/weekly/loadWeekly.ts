import { prisma } from "@/lib/prisma";
import { starTotal } from "@/features/stars/award";
import { moscowToday } from "./schedule";

export async function loadWeekly(studentId: string) {
  const [tasks, submissions, total] = await Promise.all([
    prisma.weeklyTask.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.weeklySubmission.findMany({
      where: { studentId },
      select: { weeklyTaskId: true, text: true },
    }),
    starTotal(studentId),
  ]);
  return { tasks, submissions, total, today: moscowToday() };
}
