"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import { nextTaskStatus } from "@/features/tasks/status";

export async function createCustomExercise(studentId: string) {
  await requireMentor(studentId);
  const count = await prisma.customExercise.count({ where: { studentId } });
  return prisma.customExercise.create({
    data: { studentId, order: count },
    include: { comments: true },
  });
}

export async function updateExerciseTask(exerciseId: string, value: string) {
  const exercise = await prisma.customExercise.findUniqueOrThrow({ where: { id: exerciseId } });
  await requireMentor(exercise.studentId);
  await prisma.customExercise.update({ where: { id: exerciseId }, data: { task: value } });
}

/**
 * Student edits land directly in `answer`. Mentor edits to a non-empty
 * existing answer are stored as a suggestion (`answerSuggested`) instead
 * of overwriting, so the student can see the diff and accept it.
 */
export async function updateExerciseAnswer(exerciseId: string, value: string) {
  const exercise = await prisma.customExercise.findUniqueOrThrow({ where: { id: exerciseId } });
  const session = await requireCabinetAccess(exercise.studentId);

  if (session.role === "STUDENT" || !exercise.answer) {
    await prisma.customExercise.update({
      where: { id: exerciseId },
      data: { answer: value, answerSuggested: null },
    });
    return;
  }

  await prisma.customExercise.update({
    where: { id: exerciseId },
    data: { answerSuggested: value },
  });
}

export async function acceptAnswerSuggestion(exerciseId: string) {
  const exercise = await prisma.customExercise.findUniqueOrThrow({ where: { id: exerciseId } });
  await requireCabinetAccess(exercise.studentId);
  if (!exercise.answerSuggested) return;
  await prisma.customExercise.update({
    where: { id: exerciseId },
    data: { answer: exercise.answerSuggested, answerSuggested: null },
  });
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
  await requireMentor(exercise.studentId);
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

export async function updateExerciseComment(commentId: string, text: string) {
  const comment = await prisma.exerciseComment.findUniqueOrThrow({ where: { id: commentId } });
  const exercise = await prisma.customExercise.findUniqueOrThrow({ where: { id: comment.exerciseId } });
  await requireCabinetAccess(exercise.studentId);
  await prisma.exerciseComment.update({ where: { id: commentId }, data: { text } });
}

export async function deleteExerciseComment(commentId: string) {
  const comment = await prisma.exerciseComment.findUniqueOrThrow({ where: { id: commentId } });
  const exercise = await prisma.customExercise.findUniqueOrThrow({ where: { id: comment.exerciseId } });
  await requireCabinetAccess(exercise.studentId);
  await prisma.exerciseComment.delete({ where: { id: commentId } });
}
