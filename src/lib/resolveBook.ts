import type { Book } from "@/generated/prisma/client";
import { bookImagePath } from "@/lib/cabinetImage";
import { prisma } from "@/lib/prisma";

type ImageFlags = {
  id: string;
  cover: boolean;
  cover2: boolean;
  cover3: boolean;
  banner: boolean;
  setting: boolean;
};

function withImagePaths(book: Omit<Book, "coverUrl" | "coverUrl2" | "coverUrl3" | "bannerUrl" | "settingPhotoUrl">, flags: ImageFlags | undefined): Book {
  return {
    ...book,
    coverUrl: flags?.cover ? bookImagePath(book.id, "cover") : null,
    coverUrl2: flags?.cover2 ? bookImagePath(book.id, "cover2") : null,
    coverUrl3: flags?.cover3 ? bookImagePath(book.id, "cover3") : null,
    bannerUrl: flags?.banner ? bookImagePath(book.id, "banner") : null,
    settingPhotoUrl: flags?.setting ? bookImagePath(book.id, "setting") : null,
  };
}

export async function resolveActiveBook(studentId: string, requestedBookId?: string) {
  const started = Date.now();
  // Картинки не читаем: это data: URI на мегабайты, из-за них «О книге» не дорисовывалась.
  // Признак «файл есть» смотрит только заголовок строки и файл с диска не поднимает.
  const [rows, flags] = await Promise.all([
    prisma.book.findMany({
      where: { studentId },
      orderBy: { createdAt: "asc" },
      omit: {
        coverUrl: true,
        coverUrl2: true,
        coverUrl3: true,
        bannerUrl: true,
        settingPhotoUrl: true,
      },
    }),
    prisma.$queryRaw<ImageFlags[]>`
      SELECT id,
        ("coverUrl" IS NOT NULL) AS cover,
        ("coverUrl2" IS NOT NULL) AS cover2,
        ("coverUrl3" IS NOT NULL) AS cover3,
        ("bannerUrl" IS NOT NULL) AS banner,
        ("settingPhotoUrl" IS NOT NULL) AS setting
      FROM "Book"
      WHERE "studentId" = ${studentId}
    `,
  ]);

  const byId = new Map(flags.map((row) => [row.id, row]));
  const books = rows.map((book) => withImagePaths(book, byId.get(book.id)));
  const elapsed = Date.now() - started;
  if (elapsed > 400) console.info(`[book] ${studentId} книг ${books.length}, ${elapsed}ms`);
  if (books.length === 0) return { books, activeBook: null };

  const activeBook = books.find((book) => book.id === requestedBookId) ?? books[0];
  return { books, activeBook };
}
