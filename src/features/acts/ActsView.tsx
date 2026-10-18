import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import BookPlanBoard from "./BookPlanBoard";
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
        <PageHeader title="План книги" description="Акты, главы и сюжетные линии на одном листе." />
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  const [acts, planChapters] = await Promise.all([
    prisma.act.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
      include: { chapters: { orderBy: { order: "asc" }, include: { blocks: { orderBy: { order: "asc" } } } } },
    }),
    prisma.planChapter.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
      select: { plannedChars: true, writtenChars: true, actBreakAfter: true },
    }),
  ]);
  const actSuggestions = await getSuggestionsForRecords("Act", acts.map((a) => a.id));
  const actComments = await getCommentsForRecords("Act", acts.map((a) => a.id));

  return (
    <BookPlanBoard
      bookId={activeBook.id}
      initialActs={acts}
      suggestions={actSuggestions}
      comments={actComments}
      planChapters={planChapters}
      banners={<StudioBanners studentId={studentId} basePath={basePath} />}
      bookSelect={<BookSelect books={books} activeBookId={activeBook.id} compact />}
    />
  );
}
