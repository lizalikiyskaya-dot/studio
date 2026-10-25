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
import type { ChapterCommentPreview, ChapterDeadlineMark, ChapterWeeklyCard } from "./ChapterSide";

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
  const deadlines = await loadDeadlines(studentId);
  const comment = await loadLatestComment(activeBook.id, chapters.map((chapter) => ({ id: chapter.id, title: chapter.title })));
  const weekly = await loadWeekly();

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
        deadlines={deadlines}
        comment={comment}
        weekly={weekly}
        weeklyHref={`${basePath}/weekly`}
      />
    </div>
  );
}

function moscowIso(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function loadDeadlines(studentId: string): Promise<ChapterDeadlineMark[]> {
  const tasks = await prisma.task.findMany({
    where: { studentId, deadline: { not: null }, status: { not: "ACCEPTED" } },
    select: { title: true, deadline: true },
    orderBy: { deadline: "asc" },
    take: 40,
  });
  return tasks.flatMap((task) => {
    if (!task.deadline) return [];
    return [{ iso: moscowIso(task.deadline), label: task.title.trim() || "Задание" }];
  });
}

async function loadLatestComment(
  bookId: string,
  chapters: { id: string; title: string }[],
): Promise<ChapterCommentPreview> {
  const ids = chapters.map((chapter) => chapter.id);
  const [bookComments, chapterComments] = await Promise.all([
    prisma.comment.findMany({ where: { model: "Book", recordId: bookId }, orderBy: { createdAt: "desc" }, take: 1 }),
    ids.length === 0
      ? Promise.resolve([])
      : prisma.comment.findMany({ where: { model: "PlanChapter", recordId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 1 }),
  ]);
  const book = bookComments[0];
  const chapter = chapterComments[0];
  const pick = !book ? chapter : !chapter ? book : book.createdAt > chapter.createdAt ? book : chapter;
  if (!pick) return null;
  const where = pick.model === "Book"
    ? "О книге"
    : chapters.find((item) => item.id === pick.recordId)?.title.trim() || "Глава";
  return { author: pick.author, text: pick.text, where };
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
