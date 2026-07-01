"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import type { WorkPlanStatus } from "@/generated/prisma/client";

export async function createWorkPlan(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.workPlan.count({ where: { studentId } });
  return prisma.workPlan.create({
    data: { studentId, order: count },
  });
}

export async function deleteWorkPlan(id: string) {
  const plan = await prisma.workPlan.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(plan.studentId);
  await prisma.workPlan.delete({ where: { id } });
}

export async function updateWorkPlanField(
  id: string,
  field: "monthStart" | "monthEnd" | "description" | "note",
  value: string
) {
  const plan = await prisma.workPlan.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(plan.studentId);
  await prisma.workPlan.update({ where: { id }, data: { [field]: value } });
}

export async function cycleWorkPlanStatus(id: string) {
  const plan = await prisma.workPlan.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(plan.studentId);
  const next: Record<WorkPlanStatus, WorkPlanStatus> = {
    PLANNED: "IN_PROGRESS",
    IN_PROGRESS: "DONE",
    DONE: "PLANNED",
  };
  await prisma.workPlan.update({ where: { id }, data: { status: next[plan.status] } });
  return next[plan.status];
}
