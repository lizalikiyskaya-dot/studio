"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

export async function setReviewMode(studentId: string, enabled: boolean) {
  await requireCabinetAccess(studentId);
  await prisma.user.update({ where: { id: studentId }, data: { reviewModeEnabled: enabled } });
}
