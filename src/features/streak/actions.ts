"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMentor } from "@/lib/access";
import { awardStreakBonuses } from "./credit";
import { loadStreak } from "./load";
import { visibleMondays } from "./weeks";

function weekDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export async function setStreakVacation(studentId: string, weekStart: string, on: boolean) {
  await requireMentor(studentId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return;
  if (!visibleMondays().includes(weekStart)) return;

  if (on) {
    await prisma.streakVacation.create({ data: { studentId, weekStart: weekDate(weekStart) } }).catch((error: unknown) => {
      const unique = typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
      if (!unique) throw error;
    });
  } else {
    await prisma.streakVacation.deleteMany({ where: { studentId, weekStart: weekDate(weekStart) } });
  }

  const stats = await loadStreak(studentId);
  await awardStreakBonuses(studentId, stats.best);

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/weekly");
  revalidatePath(`/student-view/${studentId}/tasks`);
  revalidatePath(`/student-view/${studentId}/weekly`);
}
