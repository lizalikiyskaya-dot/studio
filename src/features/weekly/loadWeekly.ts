import { prisma } from "@/lib/prisma";
import { starAccount } from "@/features/stars/award";
import { loadStreak } from "@/features/streak/load";
import { moscowToday } from "./schedule";

export async function loadWeekly(studentId: string) {
  const [tasks, submissions, account, streak] = await Promise.all([
    prisma.weeklyTask.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.weeklySubmission.findMany({
      where: { studentId },
      select: { weeklyTaskId: true, text: true },
    }),
    starAccount(studentId),
    loadStreak(studentId),
  ]);
  return { tasks, submissions, account, streak, today: moscowToday() };
}
