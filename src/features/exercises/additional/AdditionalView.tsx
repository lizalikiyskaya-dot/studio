import { prisma } from "@/lib/prisma";
import AdditionalList from "./AdditionalList";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { getCommentsForRecords } from "@/features/comments/actions";

export default async function AdditionalView({
  studentId,
  isMentorViewer,
}: {
  studentId: string;
  isMentorViewer: boolean;
}) {
  const sections = await prisma.freeSection.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });
  const suggestions = await getSuggestionsForRecords("FreeSection", sections.map((s) => s.id));
  const comments = await getCommentsForRecords("FreeSection", sections.map((s) => s.id));

  return (
    <AdditionalList
      studentId={studentId}
      initialSections={sections}
      isMentorViewer={isMentorViewer}
      suggestions={suggestions}
      comments={comments}
    />
  );
}
