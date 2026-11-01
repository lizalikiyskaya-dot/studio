import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveActiveBook } from "@/lib/resolveBook";
import DraftsList from "./DraftsList";
import type { ManuscriptChapter } from "./ManuscriptDesk";

export default async function DraftsView({
  studentId,
  readOnly = false,
}: {
  studentId: string;
  readOnly?: boolean;
}) {
  // fileData — это сам файл. В список кладём только ссылку на скачивание.
  const [drafts, withFile] = await Promise.all([
    prisma.draft.findMany({
      where: { studentId },
      orderBy: { order: "asc" },
      omit: { fileData: true },
    }),
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Draft"
      WHERE "studentId" = ${studentId} AND "fileData" IS NOT NULL
    `,
  ]);
  const files = new Set(withFile.map((row) => row.id));
  const session = await getSession();
  const { activeBook } = await resolveActiveBook(studentId);
  const chapters: ManuscriptChapter[] = activeBook
    ? await prisma.planChapter.findMany({
        where: { bookId: activeBook.id },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          plannedChars: true,
          writtenChars: true,
          writtenHere: true,
          manuscript: true,
          manuscriptFormat: true,
        },
      })
    : [];

  return (
    <DraftsList
      studentId={studentId}
      readOnly={readOnly}
      manuscript={{
        bookId: activeBook?.id ?? null,
        bookTitle: activeBook?.title ?? "",
        chapters,
        viewerId: session?.userId ?? studentId,
      }}
      initialDrafts={drafts.map((draft) => ({
        ...draft,
        fileData: files.has(draft.id) ? `/api/drafts/${draft.id}/file` : null,
      }))}
    />
  );
}