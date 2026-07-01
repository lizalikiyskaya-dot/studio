import { prisma } from "@/lib/prisma";
import WorkPlanTable from "./WorkPlanTable";

export default async function WorkPlanView({ studentId }: { studentId: string }) {
  const plans = await prisma.workPlan.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="page-title text-[24px] font-semibold mb-6">План работы</h1>
      <WorkPlanTable studentId={studentId} initialPlans={plans} />
    </div>
  );
}
