"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

export async function createDraft(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.draft.count({ where: { studentId } });
  return prisma.draft.create({ data: { studentId, order: count } });
}

export async function updateDraftField(
  draftId: string,
  field: "title" | "note" | "link",
  value: string
) {
  const draft = await prisma.draft.findUniqueOrThrow({ where: { id: draftId } });
  await requireCabinetAccess(draft.studentId);
  await prisma.draft.update({ where: { id: draftId }, data: { [field]: value } });
}

export async function deleteDraft(draftId: string) {
  const draft = await prisma.draft.findUniqueOrThrow({ where: { id: draftId } });
  await requireCabinetAccess(draft.studentId);
  await prisma.draft.delete({ where: { id: draftId } });
}

export async function reorderDrafts(studentId: string, ids: string[]) {
  await requireCabinetAccess(studentId);
  await Promise.all(ids.map((id, order) => prisma.draft.update({ where: { id }, data: { order } })));
}
