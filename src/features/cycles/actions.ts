"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

export async function createCycle(studentId: string) {
  await requireCabinetAccess(studentId);
  const cycle = await prisma.cycle.create({
    data: { studentId, title: "Новый цикл" },
  });
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/student-view/${studentId}`, "layout");
  return cycle;
}

export async function deleteCycle(cycleId: string) {
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycle.delete({ where: { id: cycleId } });
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/student-view/${cycle.studentId}`, "layout");
}

const CYCLE_FIELDS = ["title", "genre", "concept", "annotation"] as const;
export type CycleField = (typeof CYCLE_FIELDS)[number];

export async function updateCycleField(cycleId: string, field: CycleField, value: string) {
  if (!CYCLE_FIELDS.includes(field)) throw new Error("Недопустимое поле");
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycle.update({ where: { id: cycleId }, data: { [field]: value } });
}

export async function updateCyclePhotoPosition(
  cycleId: string,
  field: "coverPosition" | "coverPosition2" | "coverPosition3" | "bannerPosition",
  position: string
) {
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);
  await prisma.cycle.update({ where: { id: cycleId }, data: { [field]: position } });
}
