"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { nextTaskStatus } from "@/features/tasks/status";

export async function createCustomExercise(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.customExercise.count({ where: { studentId } });
  return prisma.customExercise.create({
    data: { studentId, order: count },
    include: { comments: true },
  });
}

export async function updateExerciseField(
  exerciseId: string,
  field: "task" | "answer",
  value: string
) {
  const exercise = await prisma.customExercise.findUniqueOrThrow({ where: { id: exerciseId } });
  await requireCabinetAccess(exercise.studentId);
  await prisma.customExercise.update({ where: { id: exerciseId }, data: { [field]: value } });
}

export async function cycleExerciseStatus(exerciseId: string) {
  const exercise = await prisma.customExercise.findUniqueOrThrow({ where: { id: exerciseId } });
  await requireCabinetAccess(exercise.studentId);
  const status = nextTaskStatus(exercise.status);
  await prisma.customExercise.update({ where: { id: exerciseId }, data: { status } });
  return status;
}

export async function deleteCustomExercise(exerciseId: string) {
  const exercise = await prisma.customExercise.findUniqueOrThrow({ where: { id: exerciseId } });
  await requireCabinetAccess(exercise.studentId);
  await prisma.customExercise.delete({ where: { id: exerciseId } });
}

export async function addExerciseComment(exerciseId: string, text: string) {
  const exercise = await prisma.customExercise.findUniqueOrThrow({ where: { id: exerciseId } });
  const session = await requireCabinetAccess(exercise.studentId);
  const author = session.role === "MENTOR" ? "Наставник" : "Ученик";
  return prisma.exerciseComment.create({
    data: { exerciseId, author, text },
  });
}
