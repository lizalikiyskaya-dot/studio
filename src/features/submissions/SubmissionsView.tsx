import { prisma } from "@/lib/prisma";
import Subtabs from "@/components/Subtabs";
import SubmissionsTable from "./SubmissionsTable";

export default async function SubmissionsView({ studentId }: { studentId: string }) {
  const rows = await prisma.submission.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });
  const contest = rows.filter((r) => r.type === "CONTEST");
  const publisher = rows.filter((r) => r.type === "PUBLISHER");

  return (
    <div>
      <h1 className="page-title text-[24px] font-semibold mb-6">Трекер заявок</h1>
      <Subtabs
        tabs={[
          {
            label: "На конкурс",
            content: <SubmissionsTable studentId={studentId} type="CONTEST" initial={contest} />,
          },
          {
            label: "В издательство",
            content: <SubmissionsTable studentId={studentId} type="PUBLISHER" initial={publisher} />,
          },
        ]}
      />
    </div>
  );
}
