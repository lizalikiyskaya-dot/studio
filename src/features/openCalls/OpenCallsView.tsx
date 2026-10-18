import { prisma } from "@/lib/prisma";
import OpenCallsTable from "./OpenCallsTable";

export default async function OpenCallsView({ studentId }: { studentId: string }) {
  const rows = await prisma.openCall.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return <OpenCallsTable studentId={studentId} initial={rows} />;
}