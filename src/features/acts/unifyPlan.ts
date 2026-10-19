import { createHash } from "crypto";
import { chapterTitle, foldedDescription } from "./chapterText";

export function stableId(prefix: string, seed: string) {
  return prefix + createHash("md5").update(seed).digest("hex").slice(0, 24);
}

export type UnifyPlanChapter = {
  id: string;
  order: number;
  title: string;
  description: string;
  summary: string;
  dramaticArgument: string;
  note: string;
  images: string;
  actId: string | null;
  actBreakAfter: boolean;
};

export type UnifyAct = {
  id: string;
  chapters: { id: string; title: string; description: string }[];
};

export type ChapterWrite = {
  id: string;
  title: string;
  description: string;
  actId: string | null;
};

export type ChapterCreate = ChapterWrite & { bookId: string; order: number };
export type ActCreate = { id: string; bookId: string; order: number; title: string };
export type BlockMove = { actChapterId: string; planChapterId: string };

export type Unification = {
  writes: ChapterWrite[];
  creates: ChapterCreate[];
  acts: ActCreate[];
  blockMoves: BlockMove[];
};

const emptyText = { description: "", summary: "", dramaticArgument: "", note: "", images: "" };

/**
 * То же сведение глав, что раньше шло сотней UPDATE внутри запроса страницы.
 * Здесь только расчёт: какие строки записать. Повтор на тех же данных
 * не размножает текст — foldedDescription это уже умеет.
 */
export function planUnification(bookId: string, plan: UnifyPlanChapter[], acts: UnifyAct[]): Unification {
  const flat = acts.flatMap((act) => act.chapters.map((chapter) => ({ ...chapter, parentActId: act.id })));
  const paired = new Set<string>();
  const writes: ChapterWrite[] = [];
  const blockMoves: BlockMove[] = [];
  const finalActId = new Map<string, string | null>();

  for (let index = 0; index < plan.length; index += 1) {
    const chapter = plan[index];
    const actChapter = flat[index];
    if (actChapter) paired.add(actChapter.id);
    const description = foldedDescription(chapter, actChapter ? [actChapter.description] : []);
    const title = chapterTitle(chapter.title, actChapter?.title ?? "", chapter.summary);
    const actId = chapter.actId ?? actChapter?.parentActId ?? null;
    finalActId.set(chapter.id, actId);
    if (description !== chapter.description || title !== chapter.title || actId !== chapter.actId) {
      writes.push({ id: chapter.id, title, description, actId });
    }
    if (actChapter) blockMoves.push({ actChapterId: actChapter.id, planChapterId: chapter.id });
  }

  const creates: ChapterCreate[] = [];
  let order = plan.reduce((max, chapter) => Math.max(max, chapter.order), -1);
  for (const actChapter of flat) {
    if (paired.has(actChapter.id)) continue;
    order += 1;
    const id = stableId("pch_", actChapter.id);
    creates.push({
      id,
      bookId,
      order,
      title: actChapter.title,
      description: foldedDescription(emptyText, [actChapter.description]),
      actId: actChapter.parentActId,
    });
    blockMoves.push({ actChapterId: actChapter.id, planChapterId: id });
  }

  const newActs: ActCreate[] = [];

  if (acts.length === 0 && plan.length > 0) {
    let actOrder = 0;
    let actId = stableId("act_", `${bookId}:0`);
    newActs.push({ id: actId, bookId, order: 0, title: "Акт 1" });
    for (const chapter of plan) {
      finalActId.set(chapter.id, actId);
      if (!chapter.actBreakAfter) continue;
      actOrder += 1;
      actId = stableId("act_", `${bookId}:${actOrder}`);
      newActs.push({ id: actId, bookId, order: actOrder, title: `Акт ${actOrder + 1}` });
    }
    for (const chapter of plan) {
      const actIdForChapter = finalActId.get(chapter.id) ?? null;
      const write = writes.find((row) => row.id === chapter.id);
      if (write) write.actId = actIdForChapter;
      else if (actIdForChapter !== chapter.actId) {
        writes.push({
          id: chapter.id,
          title: chapter.title,
          description: chapter.description,
          actId: actIdForChapter,
        });
      }
    }
  } else if (acts.length > 0) {
    const loose = plan.filter((chapter) => (finalActId.get(chapter.id) ?? null) === null);
    if (loose.length > 0) {
      const id = stableId("act_", `${bookId}:extra`);
      newActs.push({ id, bookId, order: acts.length, title: "Ещё" });
      for (const chapter of loose) {
        const write = writes.find((row) => row.id === chapter.id);
        if (write) write.actId = id;
        else {
          writes.push({ id: chapter.id, title: chapter.title, description: chapter.description, actId: id });
        }
      }
    }
  }

  return { writes, creates, acts: newActs, blockMoves };
}
