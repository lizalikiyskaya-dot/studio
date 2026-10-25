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
import { formatWeeklyDate, moscowToday, pickWeekly } from "@/features/weekly/schedule";
import type { ChapterWeeklyCard } from "./ChapterSide";

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
  const weekly = await loadWeekly();
  const canReview = basePath.startsWith("/student-view");

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
        canReview={canReview}
        weekly={weekly}
        weeklyHref={`${basePath}/weekly`}
      />
    </div>
  );
}

async function loadWeekly(): Promise<ChapterWeeklyCard> {
  try {
    const tasks = await prisma.weeklyTask.findMany({ select: { id: true, title: true, publishedOn: true } });
    const current = pickWeekly(tasks, moscowToday()).current;
    if (!current) return null;
    return { title: current.title, until: `с ${formatWeeklyDate(current.publishedOn)}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("WeeklyTask") || message.includes("P2021")) return null;
    throw error;
  }
}
