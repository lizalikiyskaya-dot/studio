import { prisma } from "@/lib/prisma";
import WorkPlanTable from "./WorkPlanTable";

export default async function WorkPlanView({ studentId }: { studentId: string }) {
  const plans = await prisma.workPlan.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return <WorkPlanTable studentId={studentId} initialPlans={plans} />;
}
