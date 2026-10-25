"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMentor } from "@/lib/access";

function touch(studentId: string) {
  revalidatePath("/dashboard/badges");
  revalidatePath("/dashboard/tasks");
  revalidatePath(`/student-view/${studentId}/badges`);
  revalidatePath(`/student-view/${studentId}/tasks`);
}

/** Наставник выдаёт или снимает значок. Снятый автоматический значок сам не возвращается. */
export async function setBadgeAward(studentId: string, badgeId: string, on: boolean): Promise<void> {
  const session = await requireMentor(studentId);
  const badge = await prisma.badge.findUnique({ where: { id: badgeId }, select: { id: true } });
  if (!badge) return;
  if (on) {
    await prisma.badgeAward.upsert({
      where: { studentId_badgeId: { studentId, badgeId } },
      create: { studentId, badgeId, source: "MANUAL", awardedById: session.userId },
      update: { revokedAt: null, source: "MANUAL", awardedById: session.userId, awardedAt: new Date() },
    });
  } else {
    await prisma.badgeAward.updateMany({
      where: { studentId, badgeId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  touch(studentId);
}
