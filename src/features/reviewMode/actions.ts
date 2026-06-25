"use server";

import { prisma } from "@/lib/prisma";
import { requireMentor } from "@/lib/access";

export async function setReviewMode(studentId: string, enabled: boolean) {
  await requireMentor(studentId);
  await prisma.user.update({ where: { id: studentId }, data: { reviewModeEnabled: enabled } });
}
