import { prisma } from "@/lib/prisma";
import DraftsList from "./DraftsList";

export default async function DraftsView({ studentId }: { studentId: string }) {
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

  return (
    <DraftsList
      studentId={studentId}
      initialDrafts={drafts.map((draft) => ({
        ...draft,
        fileData: files.has(draft.id) ? `/api/drafts/${draft.id}/file` : null,
      }))}
    />
  );
}