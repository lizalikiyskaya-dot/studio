import { prisma } from "@/lib/prisma";
import AdditionalList from "./AdditionalList";

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

  return <AdditionalList studentId={studentId} initialSections={sections} isMentorViewer={isMentorViewer} />;
}
