"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { isTaskStatus } from "./status";
import type { TaskStatus } from "@/generated/prisma/client";
import { awardStars } from "@/features/stars/award";
import { mainTaskAwardsStars } from "@/features/stars/rules";

export async function createTask(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.task.count({ where: { studentId } });
  const task = await prisma.task.create({
    data: { studentId, order: count },
  });
  revalidatePath("/dashboard/tasks");
  revalidatePath(`/student-view/${studentId}/tasks`);
  return task;
}

export async function updateTaskTitle(taskId: string, title: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await requireCabinetAccess(task.studentId);
  await prisma.task.update({ where: { id: taskId }, data: { title } });
}

export async function updateTaskLink(
  taskId: string,
  field: "workLink" | "feedbackLink",
  value: string
) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await requireCabinetAccess(task.studentId);
  await prisma.task.update({ where: { id: taskId }, data: { [field]: value } });
}

export async function updateTaskDeadline(taskId: string, deadline: string | null) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await requireCabinetAccess(task.studentId);
  await prisma.task.update({
    where: { id: taskId },
    data: { deadline: deadline ? new Date(deadline) : null },
  });
}

export async function updateTaskNotes(taskId: string, notes: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await requireCabinetAccess(task.studentId);
  await prisma.task.update({ where: { id: taskId }, data: { notes } });
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await requireCabinetAccess(task.studentId);
  await prisma.task.delete({ where: { id: taskId } });
}

export async function reorderTasks(studentId: string, ids: string[]) {
  await requireCabinetAccess(studentId);
  const existing = await prisma.task.findMany({ where: { studentId }, select: { id: true } });
  const known = new Set(existing.map((task) => task.id));
  const unique = new Set(ids);
  if (unique.size !== ids.length || ids.length !== known.size || ids.some((id) => !known.has(id))) return;
  await prisma.$transaction(ids.map((id, order) => prisma.task.update({ where: { id }, data: { order } })));
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  if (!isTaskStatus(status)) return null;
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await requireCabinetAccess(task.studentId);
  if (task.status === status) return status;
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  // 3 звёзды один раз: сдача на проверку или «принято». Повтор и «на доработке» не удваивают.
  if (mainTaskAwardsStars(status)) await awardStars(task.studentId, "MAIN_TASK", task.id);
  return status;
}
