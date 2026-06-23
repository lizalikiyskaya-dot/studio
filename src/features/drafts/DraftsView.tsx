import { prisma } from "@/lib/prisma";
import DraftsList from "./DraftsList";

export default async function DraftsView({ studentId }: { studentId: string }) {
  const drafts = await prisma.draft.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="page-title text-[24px] font-semibold mb-6">Рукописи</h1>
      <DraftsList studentId={studentId} initialDrafts={drafts} />
    </div>
  );
}
