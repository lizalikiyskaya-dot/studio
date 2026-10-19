"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { awardStars } from "@/features/stars/award";
import { submissionReadyForStars } from "@/features/stars/rules";
import { statusWhenOpenCallSentChanges } from "@/features/submissions/status";

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
  field: "target" | "deadline" | "note" | "link",
  value: string
) {
  const row = await prisma.openCall.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  await prisma.openCall.update({ where: { id }, data: { [field]: value } });
}

export async function setOpenCallSent(id: string, sent: boolean) {
  const row = await prisma.openCall.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  if (row.sent === sent) return sent;
  await prisma.openCall.update({ where: { id }, data: { sent } });
  const submission = await prisma.submission.findUnique({ where: { openCallId: id } });
  if (submission) {
    const status = statusWhenOpenCallSentChanges(submission.status, sent);
    const updated = status === submission.status
      ? submission
      : await prisma.submission.update({ where: { id: submission.id }, data: { status } });
    if (submissionReadyForStars(updated.status)) {
      await awardStars(updated.studentId, updated.type === "PUBLISHER" ? "PUBLISHER" : "CONTEST", updated.id);
    }
  }
  return sent;
}
