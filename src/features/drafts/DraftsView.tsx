import { prisma } from "@/lib/prisma";
import DraftsList from "./DraftsList";

export default async function DraftsView({ studentId }: { studentId: string }) {
  const drafts = await prisma.draft.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return <DraftsList studentId={studentId} initialDrafts={drafts} />;
}