"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import type { SubmissionType, SubmissionStatus } from "@/generated/prisma/client";

export async function createSubmission(studentId: string, type: SubmissionType) {
  await requireCabinetAccess(studentId);
  const count = await prisma.submission.count({ where: { studentId, type } });
  return prisma.submission.create({ data: { studentId, type, order: count } });
}

export async function deleteSubmission(id: string) {
  const row = await prisma.submission.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  await prisma.submission.delete({ where: { id } });
}

export async function updateSubmissionField(
  id: string,
  field: "target" | "work" | "date" | "note",
  value: string
) {
  const row = await prisma.submission.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  await prisma.submission.update({ where: { id }, data: { [field]: value } });
}

export async function cycleSubmissionStatus(id: string) {
  const row = await prisma.submission.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  const next: Record<SubmissionStatus, SubmissionStatus> = {
    WAITING: "ACCEPTED",
    ACCEPTED: "REJECTED",
    REJECTED: "WAITING",
  };
  await prisma.submission.update({ where: { id }, data: { status: next[row.status] } });
  return next[row.status];
}
