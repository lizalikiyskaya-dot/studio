"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";

export async function createBeliefCard(studentId: string, isExample: boolean) {
  if (isExample) {
    await requireMentor(studentId);
  } else {
    await requireCabinetAccess(studentId);
  }
  const count = await prisma.beliefCard.count({ where: { studentId, isExample } });
  return prisma.beliefCard.create({ data: { studentId, isExample, order: count } });
}

export async function updateBeliefField(
  cardId: string,
  field: "hero" | "startBelief" | "endBelief",
  value: string
) {
  const card = await prisma.beliefCard.findUniqueOrThrow({ where: { id: cardId } });
  if (card.isExample) {
    await requireMentor(card.studentId);
  } else {
    await requireCabinetAccess(card.studentId);
  }
  await prisma.beliefCard.update({ where: { id: cardId }, data: { [field]: value } });
}

export async function reorderBeliefCards(studentId: string, isExample: boolean, orderedIds: string[]) {
  if (isExample) {
    await requireMentor(studentId);
  } else {
    await requireCabinetAccess(studentId);
  }
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.beliefCard.update({ where: { id }, data: { order: index } }))
  );
}

export async function deleteBeliefCard(cardId: string) {
  const card = await prisma.beliefCard.findUniqueOrThrow({ where: { id: cardId } });
  if (card.isExample) {
    await requireMentor(card.studentId);
  } else {
    await requireCabinetAccess(card.studentId);
  }
  await prisma.beliefCard.delete({ where: { id: cardId } });
}
