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
  const books = await prisma.book.findMany({
    where: { studentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      genre: true,
      partsCount: true,
      coverUrl: true,
      bannerUrl: true,
      chapters: { select: { writtenChars: true, plannedChars: true } },
    },
  });

  return books.map((book) => ({
    id: book.id,
    title: book.title,
    genre: book.genre,
    partsCount: book.partsCount,
    imageUrl: book.coverUrl || book.bannerUrl || null,
    written: book.chapters.reduce((sum, chapter) => sum + chapter.writtenChars, 0),
    planned: book.chapters.reduce((sum, chapter) => sum + chapter.plannedChars, 0),
  }));
}
