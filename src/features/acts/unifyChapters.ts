import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { chapterTitle, foldedDescription } from "./chapterText";

function stableId(prefix: string, seed: string) {
  return prefix + createHash("md5").update(seed).digest("hex").slice(0, 24);
}

// Один раз на книгу переносит старые главы акта и тексты трекера
// в общую главу PlanChapter. Исходные столбцы не очищает и строки не удаляет.
export async function ensureUnifiedChapters(bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { chaptersUnified: true },
  });
  if (!book || book.chaptersUnified) return;

  const [plan, acts] = await Promise.all([
    prisma.planChapter.findMany({ where: { bookId }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
    prisma.act.findMany({
      where: { bookId },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      include: {
        chapters: {
          orderBy: [{ order: "asc" }, { id: "asc" }],
          include: { blocks: { orderBy: { order: "asc" } } },
        },
      },
    }),
  ]);

  const flat = acts.flatMap((act) => act.chapters.map((chapter) => ({ ...chapter, parentActId: act.id })));

  await prisma.$transaction(async (tx) => {
    const paired = new Set<string>();
    for (let index = 0; index < plan.length; index += 1) {
      const chapter = plan[index];
      const actChapter = flat[index];
      if (actChapter) paired.add(actChapter.id);
      const description = foldedDescription(chapter, actChapter ? [actChapter.description] : []);
      const title = chapterTitle(chapter.title, actChapter?.title ?? "", chapter.summary);
      const actId = chapter.actId ?? actChapter?.parentActId ?? null;
      if (description !== chapter.description || title !== chapter.title || actId !== chapter.actId) {
        await tx.planChapter.update({
          where: { id: chapter.id },
          data: { description, title, actId },
        });
      }
      if (actChapter) {
        await tx.storylineBlock.updateMany({
          where: { chapterId: actChapter.id, planChapterId: null },
          data: { planChapterId: chapter.id, chapterId: null },
        });
      }
    }

    let order = plan.reduce((max, chapter) => Math.max(max, chapter.order), -1);
    for (const actChapter of flat) {
      if (paired.has(actChapter.id)) continue;
      order += 1;
      const id = stableId("pch_", actChapter.id);
      await tx.planChapter.upsert({
        where: { id },
        create: {
          id,
          bookId,
          order,
          title: actChapter.title,
          description: foldedDescription(
            { description: "", summary: "", dramaticArgument: "", note: "", images: "" },
            [actChapter.description],
          ),
          actId: actChapter.parentActId,
        },
        update: {},
      });
      await tx.storylineBlock.updateMany({
        where: { chapterId: actChapter.id, planChapterId: null },
        data: { planChapterId: id, chapterId: null },
      });
    }

    if (acts.length === 0 && plan.length > 0) {
      let actOrder = 0;
      let actId = stableId("act_", `${bookId}:0`);
      await tx.act.upsert({
        where: { id: actId },
        create: { id: actId, bookId, order: 0, title: "Акт 1" },
        update: {},
      });
      for (const chapter of plan) {
        await tx.planChapter.update({ where: { id: chapter.id }, data: { actId } });
        if (!chapter.actBreakAfter) continue;
        actOrder += 1;
        actId = stableId("act_", `${bookId}:${actOrder}`);
        await tx.act.upsert({
          where: { id: actId },
          create: { id: actId, bookId, order: actOrder, title: `Акт ${actOrder + 1}` },
          update: {},
        });
      }
    }

    const loose = await tx.planChapter.count({ where: { bookId, actId: null } });
    if (loose > 0 && acts.length > 0) {
      const id = stableId("act_", `${bookId}:extra`);
      await tx.act.upsert({
        where: { id },
        create: { id, bookId, order: acts.length, title: "Ещё" },
        update: {},
      });
      await tx.planChapter.updateMany({ where: { bookId, actId: null }, data: { actId: id } });
    }

    await tx.book.update({ where: { id: bookId }, data: { chaptersUnified: true } });
  }, { timeout: 20000 });
}
