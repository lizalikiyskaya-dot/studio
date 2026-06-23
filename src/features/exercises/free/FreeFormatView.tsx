import { prisma } from "@/lib/prisma";
import FreeFormatList from "./FreeFormatList";

export default async function FreeFormatView({ studentId }: { studentId: string }) {
  const sections = await prisma.freeSection.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return <FreeFormatList studentId={studentId} initialSections={sections} />;
}
