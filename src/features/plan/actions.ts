"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

const COLORS = ["#2FB083", "#F28A3C", "#3B9EDB", "#7B6CF6", "#E0528A"];

async function bookOf(bookId: string) {
  const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
  await requireCabinetAccess(book.studentId);
  return book;
}

async function cardOf(cardId: string) {
  const card = await prisma.planCard.findUniqueOrThrow({ where: { id: cardId } });
  await bookOf(card.bookId);
  return card;
}

export async function createStoryline(bookId: string, name: string) {
  await bookOf(bookId);
  const count = await prisma.storyline.count({ where: { bookId } });
  const title = name.replace(/\s+/g, " ").trim().slice(0, 200) || "Новая ветка";
  return prisma.storyline.create({
    data: { bookId, order: count, name: title, color: COLORS[count % COLORS.length] },
  });
}

export async function renameStoryline(lineId: string, name: string) {
  const line = await prisma.storyline.findUniqueOrThrow({ where: { id: lineId } });
  await bookOf(line.bookId);
  const title = name.replace(/\s+/g, " ").trim().slice(0, 200) || "Ветка";
  await prisma.storyline.update({ where: { id: lineId }, data: { name: title } });
  return title;
}

export async function deleteStoryline(lineId: string) {
  const line = await prisma.storyline.findUniqueOrThrow({ where: { id: lineId } });
  await bookOf(line.bookId);
  await prisma.storyline.delete({ where: { id: lineId } });
}

export async function createPlanCard(bookId: string, storylineId: string, actId: string | null, title: string) {
  await bookOf(bookId);
  const line = await prisma.storyline.findFirst({ where: { id: storylineId, bookId } });
  if (!line) return null;
  const act = actId ? await prisma.act.findFirst({ where: { id: actId, bookId } }) : null;
  const count = await prisma.planCard.count({ where: { bookId, actId: act?.id ?? null } });
  const name = title.replace(/\s+/g, " ").trim().slice(0, 200) || "Событие";
  return prisma.planCard.create({
    data: {
      bookId,
      storylineId: line.id,
      actId: act?.id ?? null,
      order: count,
      title: name,
    },
  });
}

export async function updatePlanCard(cardId: string, field: "title" | "body", value: string) {
  await cardOf(cardId);
  const text = field === "title" ? value.replace(/\s+/g, " ").trim().slice(0, 200) : value.slice(0, 4000);
  await prisma.planCard.update({ where: { id: cardId }, data: { [field]: text } });
}

export async function deletePlanCard(cardId: string) {
  await cardOf(cardId);
  await prisma.planCard.delete({ where: { id: cardId } });
}

/** Куда встала карточка. orderedIds — порядок в новой группе, карточка уже внутри. */
export async function placePlanCard(
  cardId: string,
  patch: { storylineId: string; actId: string | null; planChapterId: string | null },
  orderedIds: string[],
) {
  const card = await cardOf(cardId);
  const line = await prisma.storyline.findFirst({ where: { id: patch.storylineId, bookId: card.bookId } });
  if (!line) return;
  const act = patch.actId
    ? await prisma.act.findFirst({ where: { id: patch.actId, bookId: card.bookId } })
    : null;
  const chapter = patch.planChapterId
    ? await prisma.planChapter.findFirst({ where: { id: patch.planChapterId, bookId: card.bookId } })
    : null;
  const ids = orderedIds.filter((id, index) => orderedIds.indexOf(id) === index);
  if (!ids.includes(cardId)) return;
  await prisma.$transaction([
    prisma.planCard.update({
      where: { id: cardId },
      data: {
        storylineId: line.id,
        actId: act?.id ?? null,
        planChapterId: chapter?.id ?? null,
      },
    }),
    ...ids.map((id, order) => prisma.planCard.updateMany({ where: { id, bookId: card.bookId }, data: { order } })),
  ]);
}
