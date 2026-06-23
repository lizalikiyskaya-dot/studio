"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

export async function createFreeSection(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.freeSection.count({ where: { studentId } });
  return prisma.freeSection.create({
    data: { studentId, order: count, title: "Новый раздел" },
  });
}

export async function updateFreeSectionField(
  sectionId: string,
  field: "title" | "content",
  value: string
) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireCabinetAccess(section.studentId);
  await prisma.freeSection.update({ where: { id: sectionId }, data: { [field]: value } });
}

export async function deleteFreeSection(sectionId: string) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireCabinetAccess(section.studentId);
  await prisma.freeSection.delete({ where: { id: sectionId } });
}
