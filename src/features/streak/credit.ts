import { prisma } from "@/lib/prisma";
import { syncAutoBadges } from "@/features/badges/sync";
import { awardStars } from "@/features/stars/award";
import { evaluateStreak, moscowMonday, streakMilestones } from "./weeks";

function weekDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function weekIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function awardReached(studentId: string, best: number) {
  for (const milestone of streakMilestones(best)) {
    await awardStars(studentId, "STREAK", String(milestone.length), milestone.points);
  }
}

/** Засчитать текущую московскую неделю. Повтор той же недели ничего не меняет. */
export async function creditStreakWeek(studentId: string, now = new Date()): Promise<boolean> {
  const weekStart = moscowMonday(now);
  try {
    await prisma.streakWeek.create({
      data: { studentId, weekStart: weekDate(weekStart) },
    });
  } catch (error) {
    const unique = typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
    if (unique) return false;
    throw error;
  }
  const [credits, vacations] = await Promise.all([
    prisma.streakWeek.findMany({ where: { studentId }, select: { weekStart: true } }),
    prisma.streakVacation.findMany({ where: { studentId }, select: { weekStart: true } }),
  ]);
  const stats = evaluateStreak(
    credits.map((row) => weekIso(row.weekStart)),
    vacations.map((row) => weekIso(row.weekStart)),
    now,
  );
  await awardReached(studentId, stats.best);
  await syncAutoBadges(studentId);
  return true;
}

export async function awardStreakBonuses(studentId: string, best: number) {
  await awardReached(studentId, best);
}
