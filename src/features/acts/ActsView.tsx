import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import BookPlanBoard from "./BookPlanBoard";
import { ensureUnifiedChapters } from "./unifyChapters";
import { normalizePlanView } from "./chapterText";
import StudioBanners from "@/components/StudioBanners";
import PageHeader from "@/components/PageHeader";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { getCommentsForRecords } from "@/features/comments/actions";

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

  const [acts, chapters, student] = await Promise.all([
    prisma.act.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
    }),
    prisma.planChapter.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
      include: { blocks: { orderBy: { order: "asc" } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: studentId }, select: { planView: true } }),
  ]);
  const [actSuggestions, chapterSuggestions, actComments] = await Promise.all([
    getSuggestionsForRecords("Act", acts.map((act) => act.id)),
    getSuggestionsForRecords("PlanChapter", chapters.map((chapter) => chapter.id)),
    getCommentsForRecords("Act", acts.map((act) => act.id)),
  ]);

  return (
    <BookPlanBoard
      bookId={activeBook.id}
      studentId={studentId}
      initialView={normalizePlanView(student.planView)}
      initialActs={acts}
      initialChapters={chapters}
      suggestions={chapterSuggestions}
      actSuggestions={actSuggestions}
      comments={actComments}
      banners={<StudioBanners studentId={studentId} basePath={basePath} />}
      bookSelect={<BookSelect books={books} activeBookId={activeBook.id} compact />}
    />
  );
}
