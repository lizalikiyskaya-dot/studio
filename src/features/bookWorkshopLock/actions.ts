"use server";

import { prisma } from "@/lib/prisma";
import { requireMentor } from "@/lib/access";

export async function toggleBookWorkshopLock(studentId: string) {
  const student = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
  await requireMentor(studentId);
  const updated = await prisma.user.update({
    where: { id: studentId },
    data: { bookWorkshopUnlocked: !student.bookWorkshopUnlocked },
  });
  return updated.bookWorkshopUnlocked;
}
