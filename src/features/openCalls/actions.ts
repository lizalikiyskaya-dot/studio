"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

export async function createOpenCall(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.openCall.count({ where: { studentId } });
  return prisma.openCall.create({ data: { studentId, order: count } });
}

export async function deleteOpenCall(id: string) {
  const row = await prisma.openCall.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  await prisma.openCall.delete({ where: { id } });
}

export async function updateOpenCallField(
  id: string,
  field: "target" | "deadline" | "note",
  value: string
) {
  const row = await prisma.openCall.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  await prisma.openCall.update({ where: { id }, data: { [field]: value } });
}

export async function toggleOpenCallSent(id: string) {
  const row = await prisma.openCall.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  await prisma.openCall.update({ where: { id }, data: { sent: !row.sent } });
  return !row.sent;
}
