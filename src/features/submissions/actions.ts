"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import type { SubmissionType, SubmissionStatus } from "@/generated/prisma/client";

export async function addOpenCallToTracker(openCallId: string) {
  const call = await prisma.openCall.findUniqueOrThrow({ where: { id: openCallId } });
  await requireCabinetAccess(call.studentId);
  const target = call.target.trim();
  if (target) {
    const existing = await prisma.submission.findFirst({
      where: { studentId: call.studentId, target: { equals: target, mode: "insensitive" } },
    });
    if (existing) return;
  }
  const count = await prisma.submission.count({ where: { studentId: call.studentId, type: "CONTEST" } });
  await prisma.submission.create({
    data: {
      studentId: call.studentId,
      type: "CONTEST",
      order: count,
      target: call.target,
      date: call.deadline,
      note: call.note,
      link: call.link,
    },
  });
}

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
  field: "target" | "work" | "date" | "note" | "link",
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
