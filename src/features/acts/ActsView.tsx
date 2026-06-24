import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import ActsGrid from "./ActsGrid";
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
        <h1 className="page-title text-[24px] font-semibold mb-6">План книги</h1>
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  const acts = await prisma.act.findMany({
    where: { bookId: activeBook.id },
    orderBy: { order: "asc" },
    include: { chapters: { orderBy: { order: "asc" }, include: { blocks: { orderBy: { order: "asc" } } } } },
  });
  const actSuggestions = await getSuggestionsForRecords("Act", acts.map((a) => a.id));
  const actComments = await getCommentsForRecords("Act", acts.map((a) => a.id));

  return (
    <div>
      <BookSelect books={books} activeBookId={activeBook.id} />
      <h1 className="page-title text-[24px] font-semibold mb-6">План книги</h1>
      <ActsGrid bookId={activeBook.id} initialActs={acts} suggestions={actSuggestions} comments={actComments} />
    </div>
  );
}
