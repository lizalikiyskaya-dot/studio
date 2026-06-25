"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import { STORY_CIRCLE_STEP_KEYS, type StoryCircleStepKey } from "./steps";

export async function createStoryCircleCard(studentId: string, isExample: boolean) {
  if (isExample) {
    await requireMentor(studentId);
  } else {
    await requireCabinetAccess(studentId);
  }
  const count = await prisma.storyCircleCard.count({ where: { studentId, isExample } });
  return prisma.storyCircleCard.create({
    data: { studentId, isExample, order: count, hero: isExample ? "Новый пример" : "Новый герой" },
  });
}

export async function updateStoryCircleHero(cardId: string, hero: string) {
  const card = await prisma.storyCircleCard.findUniqueOrThrow({ where: { id: cardId } });
  if (card.isExample) {
    await requireMentor(card.studentId);
  } else {
    await requireCabinetAccess(card.studentId);
  }
  await prisma.storyCircleCard.update({ where: { id: cardId }, data: { hero } });
}

export async function updateStoryCircleStep(cardId: string, step: StoryCircleStepKey, value: string) {
  if (!STORY_CIRCLE_STEP_KEYS.includes(step)) throw new Error("Недопустимый шаг");
  const card = await prisma.storyCircleCard.findUniqueOrThrow({ where: { id: cardId } });
  if (card.isExample) {
    await requireMentor(card.studentId);
  } else {
    await requireCabinetAccess(card.studentId);
  }
  const data = (card.data as Record<string, string>) ?? {};
  data[step] = value;
  await prisma.storyCircleCard.update({ where: { id: cardId }, data: { data } });
}

export async function reorderStoryCircleCards(studentId: string, isExample: boolean, orderedIds: string[]) {
  if (isExample) {
    await requireMentor(studentId);
  } else {
    await requireCabinetAccess(studentId);
  }
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.storyCircleCard.update({ where: { id }, data: { order: index } }))
  );
}

export async function deleteStoryCircleCard(cardId: string) {
  const card = await prisma.storyCircleCard.findUniqueOrThrow({ where: { id: cardId } });
  if (card.isExample) {
    await requireMentor(card.studentId);
  } else {
    await requireCabinetAccess(card.studentId);
  }
  await prisma.storyCircleCard.delete({ where: { id: cardId } });
}
