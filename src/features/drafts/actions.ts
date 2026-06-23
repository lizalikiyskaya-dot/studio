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

export async function updateDraftFile(draftId: string, fileName: string, fileData: string) {
  const draft = await prisma.draft.findUniqueOrThrow({ where: { id: draftId } });
  await requireCabinetAccess(draft.studentId);
  await prisma.draft.update({ where: { id: draftId }, data: { fileName, fileData } });
}

export async function deleteDraft(draftId: string) {
  const draft = await prisma.draft.findUniqueOrThrow({ where: { id: draftId } });
  await requireCabinetAccess(draft.studentId);
  await prisma.draft.delete({ where: { id: draftId } });
}
