import { bookImagePath } from "@/lib/cabinetImage";
import { prisma } from "@/lib/prisma";

export type WorkshopBook = {
  id: string;
  title: string;
  genre: string;
  partsCount: string;
  imageUrl: string | null;
  written: number;
  planned: number;
};

export async function loadWorkshopBooks(studentId: string): Promise<WorkshopBook[]> {
  const [books, covers] = await Promise.all([
    prisma.book.findMany({
      where: { studentId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        genre: true,
        partsCount: true,
        chapters: { select: { writtenChars: true, plannedChars: true } },
      },
    }),
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Book"
      WHERE "studentId" = ${studentId}
        AND ("coverUrl" IS NOT NULL OR "bannerUrl" IS NOT NULL)
    `,
  ]);
  const withImage = new Set(covers.map((row) => row.id));

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    genre: book.genre,
    partsCount: book.partsCount,
    imageUrl: withImage.has(book.id) ? bookImagePath(book.id, "card") : null,
    written: book.chapters.reduce((sum, chapter) => sum + chapter.writtenChars, 0),
    planned: book.chapters.reduce((sum, chapter) => sum + chapter.plannedChars, 0),
  }));
}
