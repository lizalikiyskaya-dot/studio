import { prisma } from "@/lib/prisma";
import OpenCallsTable from "./OpenCallsTable";

export default async function OpenCallsView({ studentId }: { studentId: string }) {
  const rows = await prisma.openCall.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="page-title text-[24px] font-semibold mb-6">Опен-коллы</h1>
      <OpenCallsTable studentId={studentId} initial={rows} />
    </div>
  );
}
