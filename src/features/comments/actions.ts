"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { SUGGESTION_REGISTRY, type SuggestableModel } from "@/lib/suggestionRegistry";

export type CommentableModel = SuggestableModel;

export async function getCommentsForRecords(model: CommentableModel, recordIds: string[]) {
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

export async function addComment(model: CommentableModel, recordId: string, text: string) {
  const studentId = await SUGGESTION_REGISTRY[model].getStudentId(recordId);
  const session = await requireCabinetAccess(studentId);
  const author = session.role === "MENTOR" ? "Наставник" : "Ученик";
  return prisma.comment.create({ data: { model, recordId, author, text } });
}

export async function updateComment(commentId: string, text: string) {
  const comment = await prisma.comment.findUniqueOrThrow({ where: { id: commentId } });
  const studentId = await SUGGESTION_REGISTRY[comment.model as CommentableModel].getStudentId(comment.recordId);
  await requireCabinetAccess(studentId);
  await prisma.comment.update({ where: { id: commentId }, data: { text } });
}

export async function deleteComment(commentId: string) {
  const comment = await prisma.comment.findUniqueOrThrow({ where: { id: commentId } });
  const studentId = await SUGGESTION_REGISTRY[comment.model as CommentableModel].getStudentId(comment.recordId);
  await requireCabinetAccess(studentId);
  await prisma.comment.delete({ where: { id: commentId } });
}
