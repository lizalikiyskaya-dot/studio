"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

export async function createBeliefCard(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.beliefCard.count({ where: { studentId } });
  return prisma.beliefCard.create({ data: { studentId, order: count } });
}

export async function updateBeliefField(
  cardId: string,
  field: "hero" | "startBelief" | "endBelief",
  value: string
) {
  const card = await prisma.beliefCard.findUniqueOrThrow({ where: { id: cardId } });
  await requireCabinetAccess(card.studentId);
  await prisma.beliefCard.update({ where: { id: cardId }, data: { [field]: value } });
}

export async function deleteBeliefCard(cardId: string) {
  const card = await prisma.beliefCard.findUniqueOrThrow({ where: { id: cardId } });
  await requireCabinetAccess(card.studentId);
  await prisma.beliefCard.delete({ where: { id: cardId } });
}
