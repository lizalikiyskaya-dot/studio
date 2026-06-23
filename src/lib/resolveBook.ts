import { prisma } from "@/lib/prisma";

export async function resolveActiveBook(studentId: string, requestedBookId?: string) {
  const books = await prisma.book.findMany({
    where: { studentId },
    orderBy: { createdAt: "asc" },
  });

  if (books.length === 0) return { books, activeBook: null };

  const activeBook = books.find((b) => b.id === requestedBookId) ?? books[0];
  return { books, activeBook };
}
