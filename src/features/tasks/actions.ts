"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { nextTaskStatus } from "./status";

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

export async function cycleTaskStatus(taskId: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  await requireCabinetAccess(task.studentId);
  const status = nextTaskStatus(task.status);
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  return status;
}
