import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "./BookSelect";
import NoBookRedirect from "./NoBookRedirect";
import PlanTable from "./PlanTable";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";

export default async function PlanBookView({
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
        <h1 className="page-title text-[24px] font-semibold mb-6">Трекер по главам</h1>
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  const chapters = await prisma.planChapter.findMany({
    where: { bookId: activeBook.id },
    orderBy: { order: "asc" },
  });
  const suggestions = await getSuggestionsForRecords("PlanChapter", chapters.map((c) => c.id));

  return (
    <div>
      <BookSelect books={books} activeBookId={activeBook.id} />
      <h1 className="page-title text-[24px] font-semibold mb-6">Трекер по главам</h1>
      <PlanTable
        bookId={activeBook.id}
        initialChapters={chapters}
        suggestions={suggestions}
        initialColumnColors={(activeBook.planColumnColors as Record<string, string>) ?? {}}
      />
    </div>
  );
}
