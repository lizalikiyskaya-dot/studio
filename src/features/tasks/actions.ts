"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { isTaskStatus } from "./status";
import type { TaskStatus } from "@/generated/prisma/client";
import { awardStars } from "@/features/stars/award";
import { creditStreakWeek } from "@/features/streak/credit";
import { linkAttachmentCounts, submittedStatusCounts } from "@/features/streak/weeks";
import { mentorSubmissionUrl, notifyMentorOfSubmission } from "@/lib/submissionMail";
import { queueMentorDigest, reviewGroup, studentTaskUrl } from "@/lib/mentorDigest";
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
  const session = await requireCabinetAccess(task.studentId);
  const previous = task[field] ?? "";
  if (previous === value) return;
  await prisma.task.update({ where: { id: taskId }, data: { [field]: value } });
  if (field === "feedbackLink" && session.role === "MENTOR" && value.trim() && value.trim() !== previous.trim()) {
    await queueMentorDigest({
      studentId: task.studentId,
      group: "feedback",
      sourceId: `task:${task.id}`,
      title: task.title,
      url: studentTaskUrl(task.id, "all"),
    });
  }
  if (field === "workLink" && linkAttachmentCounts(session, task.studentId, previous, value)) {
    await creditStreakWeek(task.studentId);
  }
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
  const session = await requireCabinetAccess(task.studentId);
  // Ученик только сдаёт на проверку. Остальные статусы ставит наставник.
  if (session.role !== "MENTOR" && status !== "SUBMITTED") return task.status;
  if (task.status === status) return status;
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  // 3 звёзды один раз: сдача на проверку или «принято». Повтор и «на доработке» не удваивают.
  if (mainTaskAwardsStars(status)) {
    await awardStars(task.studentId, "MAIN_TASK", task.id);
  }
  const review = session.role === "MENTOR" ? reviewGroup(status) : null;
  if (review) {
    await queueMentorDigest({
      studentId: task.studentId,
      group: review,
      sourceId: `task:${task.id}`,
      title: task.title,
      url: studentTaskUrl(task.id, review === "accepted" ? "accepted" : "revision"),
    });
  }
  if (submittedStatusCounts(task.status, status)) {
    await creditStreakWeek(task.studentId);
    await notifyMentorOfSubmission({
      actorRole: session.role,
      previous: task.status,
      next: status,
      studentId: task.studentId,
      section: "Задания",
      title: task.title,
      url: mentorSubmissionUrl(task.studentId, "tasks", task.id),
    });
  }
  return status;
}
