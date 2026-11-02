import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import BookOutline from "@/features/plan/BookOutline";
import { ensureUnifiedChapters } from "./unifyChapters";
import StudioBanners from "@/components/StudioBanners";
import PageHeader from "@/components/PageHeader";

export default async function ActsView({
  studentId,
  basePath,
  requestedBookId,
}: {
  studentId: string;
  basePath: string;
  requestedBookId?: string;
}) {
  const { books, activeBook } = await resolveActiveBook(studentId, requestedBookId);

  if (!activeBook) {
    return (
      <div>
        <PageHeader title="План книги" />
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  await ensureUnifiedChapters(activeBook.id);

  const [acts, chapters, lines, cards] = await Promise.all([
    prisma.act.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true },
    }),
    prisma.planChapter.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true, actId: true },
    }),
    prisma.storyline.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true, order: true },
    }),
    prisma.planCard.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
      select: { id: true, storylineId: true, actId: true, planChapterId: true, order: true, title: true, body: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title="План книги" />
      <StudioBanners studentId={studentId} basePath={basePath} />
      <div className="mb-4">
        <BookSelect books={books} activeBookId={activeBook.id} compact />
      </div>
      <BookOutline
        bookId={activeBook.id}
        initialActs={acts}
        initialChapters={chapters}
        initialLines={lines}
        initialCards={cards}
      />
    </div>
  );
}
