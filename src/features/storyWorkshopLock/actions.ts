"use server";

import { prisma } from "@/lib/prisma";
import { requireMentor } from "@/lib/access";

export async function toggleStoryWorkshopLock(studentId: string) {
  const student = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
  await requireMentor(studentId);
  const updated = await prisma.user.update({
    where: { id: studentId },
    data: { storyWorkshopUnlocked: !student.storyWorkshopUnlocked },
  });
  return updated.storyWorkshopUnlocked;
}
