import { prisma } from "@/lib/prisma";
import { evaluateStreak, type StreakPlaque } from "./weeks";

function weekIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function loadStreak(studentId: string, now = new Date()): Promise<StreakPlaque> {
  const [credits, vacations] = await Promise.all([
    prisma.streakWeek.findMany({ where: { studentId }, select: { weekStart: true } }),
    prisma.streakVacation.findMany({ where: { studentId }, select: { weekStart: true } }),
  ]);
  return evaluateStreak(
    credits.map((row) => weekIso(row.weekStart)),
    vacations.map((row) => weekIso(row.weekStart)),
    now,
  );
}
