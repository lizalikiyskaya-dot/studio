import { prisma } from "@/lib/prisma";
import type { WriteChapter } from "./writeChapterKey";

export type { WriteChapter } from "./writeChapterKey";

/** Короткие названия глав для виджета «Начать писать!». Текст рукописи сюда не берём. */
export async function loadWriteChapters(studentId: string): Promise<WriteChapter[]> {
  return prisma.planChapter.findMany({
    where: { book: { studentId } },
    orderBy: [{ bookId: "asc" }, { order: "asc" }],
    select: { id: true, bookId: true, title: true },
  });
}
