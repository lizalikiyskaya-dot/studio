import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "./BookSelect";
import NoBookRedirect from "./NoBookRedirect";
import PlanTable from "./PlanTable";

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
        <h1 className="text-[24px] font-semibold mb-6">План книги</h1>
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  const chapters = await prisma.planChapter.findMany({
    where: { bookId: activeBook.id },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <BookSelect books={books} activeBookId={activeBook.id} />
      <h1 className="text-[24px] font-semibold mb-6">План книги</h1>
      <PlanTable bookId={activeBook.id} initialChapters={chapters} />
    </div>
  );
}
