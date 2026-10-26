"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import { isTaskStatus } from "@/features/tasks/status";
import type { TaskStatus } from "@/generated/prisma/client";
import { creditStreakWeek } from "@/features/streak/credit";
import { submittedStatusCounts } from "@/features/streak/weeks";

async function saveCardStatus(
  studentId: string,
  isExample: boolean,
  previous: TaskStatus,
  next: TaskStatus,
  save: () => Promise<void>,
): Promise<TaskStatus> {
  const session = isExample ? await requireMentor(studentId) : await requireCabinetAccess(studentId);
  if (session.role !== "MENTOR" && next !== "SUBMITTED") return previous;
  if (previous === next) return previous;
  await save();
  if (!isExample && submittedStatusCounts(previous, next)) await creditStreakWeek(studentId);
  return next;
}

export async function setPopArcStatus(id: string, status: TaskStatus) {
  if (!isTaskStatus(status)) return null;
  const row = await prisma.popArcCharacter.findUniqueOrThrow({ where: { id } });
  return saveCardStatus(row.studentId, row.isExample, row.status, status, () =>
    prisma.popArcCharacter.update({ where: { id }, data: { status } }).then(() => undefined),
  );
}

export async function setBeliefStatus(id: string, status: TaskStatus) {
  if (!isTaskStatus(status)) return null;
  const row = await prisma.beliefCard.findUniqueOrThrow({ where: { id } });
  return saveCardStatus(row.studentId, row.isExample, row.status, status, () =>
    prisma.beliefCard.update({ where: { id }, data: { status } }).then(() => undefined),
  );
}

export async function setStoryCircleStatus(id: string, status: TaskStatus) {
  if (!isTaskStatus(status)) return null;
  const row = await prisma.storyCircleCard.findUniqueOrThrow({ where: { id } });
  return saveCardStatus(row.studentId, row.isExample, row.status, status, () =>
    prisma.storyCircleCard.update({ where: { id }, data: { status } }).then(() => undefined),
  );
}
