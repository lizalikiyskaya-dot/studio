import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "./BookSelect";
import NoBookRedirect from "./NoBookRedirect";
import PlanTable from "./PlanTable";
import { ensureUnifiedChapters } from "@/features/acts/unifyChapters";
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

  await ensureUnifiedChapters(activeBook.id);
  const [chapters, acts] = await Promise.all([
    prisma.planChapter.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
    }),
    prisma.act.findMany({
      where: { bookId: activeBook.id },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true },
    }),
  ]);
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
        key={activeBook.id}
        bookId={activeBook.id}
        initialChapters={chapters}
        initialActs={acts}
        suggestions={suggestions}
      />
    </div>
  );
}
