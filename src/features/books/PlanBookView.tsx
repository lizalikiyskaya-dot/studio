import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "./BookSelect";
import NoBookRedirect from "./NoBookRedirect";
import PlanTable from "./PlanTable";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import PageHeader from "@/components/PageHeader";
import { HeaderButton } from "@/components/headerAction";
import { Plus } from "lucide-react";

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
        <PageHeader title="Трекер по главам" />
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
      <PageHeader
        title="Трекер по главам"
        actions={
          <>
            <BookSelect books={books} activeBookId={activeBook.id} compact />
            <HeaderButton actionId="plan-chapter"><Plus size={16} /> Новая глава</HeaderButton>
          </>
        }
      />
      <PlanTable
        bookId={activeBook.id}
        initialChapters={chapters}
        suggestions={suggestions}
        initialColumnColors={(activeBook.planColumnColors as Record<string, string>) ?? {}}
      />
    </div>
  );
}
