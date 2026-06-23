import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import Subtabs from "@/components/Subtabs";
import ActsGrid from "./ActsGrid";
import StorylinesTable from "./StorylinesTable";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";

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
        <h1 className="page-title text-[24px] font-semibold mb-6">Акты и сюжетные линии</h1>
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  const [acts, storylines] = await Promise.all([
    prisma.act.findMany({ where: { bookId: activeBook.id }, orderBy: { order: "asc" } }),
    prisma.storyline.findMany({ where: { bookId: activeBook.id }, orderBy: { order: "asc" } }),
  ]);
  const [actSuggestions, storylineSuggestions] = await Promise.all([
    getSuggestionsForRecords("Act", acts.map((a) => a.id)),
    getSuggestionsForRecords("Storyline", storylines.map((s) => s.id)),
  ]);

  return (
    <div>
      <BookSelect books={books} activeBookId={activeBook.id} />
      <h1 className="page-title text-[24px] font-semibold mb-6">Акты и сюжетные линии</h1>
      <Subtabs
        tabs={[
          {
            label: "Акты",
            content: <ActsGrid bookId={activeBook.id} initialActs={acts} suggestions={actSuggestions} />,
          },
          {
            label: "Сюжетные линии",
            content: (
              <StorylinesTable
                bookId={activeBook.id}
                initialStorylines={storylines}
                suggestions={storylineSuggestions}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
