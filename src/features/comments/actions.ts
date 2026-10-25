"use server";

import { prisma } from "@/lib/prisma";
import { requireAuthenticated, requireCabinetAccess } from "@/lib/access";
import { SUGGESTION_REGISTRY, type SuggestableModel } from "@/lib/suggestionRegistry";
import { MODEL_SECTION, queueCabinetChange } from "@/lib/activityDigest";

export type CommentableModel = SuggestableModel | "Note";

async function getStudentIdForRecord(model: CommentableModel, recordId: string): Promise<string> {
  if (model === "Note") {
    return (await prisma.note.findUniqueOrThrow({ where: { id: recordId } })).studentId;
  }
  return SUGGESTION_REGISTRY[model].getStudentId(recordId);
}

export async function getCommentsForRecords(model: CommentableModel, recordIds: string[]) {
  // Переписка ученика с наставником — не публичные данные. Действие вызывается
  // по сети напрямую, поэтому требуем вошедшего пользователя.
  await requireAuthenticated();
  if (recordIds.length === 0) return {};
  const rows = await prisma.comment.findMany({
    where: { model, recordId: { in: recordIds } },
    orderBy: { createdAt: "asc" },
  });
  const map: Record<string, typeof rows> = {};
  for (const row of rows) {
    map[row.recordId] ??= [];
    map[row.recordId].push(row);
  }
  return map;
}

export async function addComment(model: CommentableModel, recordId: string, text: string, field?: string) {
  const studentId = await getStudentIdForRecord(model, recordId);
  const session = await requireCabinetAccess(studentId);
  const author = session.role === "MENTOR" ? "Наставник" : "Ученик";
  const move = field?.trim().slice(0, 80);
  const comment = await prisma.comment.create({
    data: { model, recordId, author, text, ...(move ? { field: move } : {}) },
  });
  await queueCabinetChange({
    studentId,
    byMentor: session.role === "MENTOR",
    section: MODEL_SECTION[model] ?? "tasks",
    detail: "Комментарий",
  });
  return comment;
}

export async function updateComment(commentId: string, text: string) {
  const comment = await prisma.comment.findUniqueOrThrow({ where: { id: commentId } });
  const studentId = await getStudentIdForRecord(comment.model as CommentableModel, comment.recordId);
  await requireCabinetAccess(studentId);
  await prisma.comment.update({ where: { id: commentId }, data: { text } });
}

export async function deleteComment(commentId: string) {
  const comment = await prisma.comment.findUniqueOrThrow({ where: { id: commentId } });
  const studentId = await getStudentIdForRecord(comment.model as CommentableModel, comment.recordId);
  await requireCabinetAccess(studentId);
  await prisma.comment.delete({ where: { id: commentId } });
}
