import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { markedTitle } from "@/components/markedTitle";
import WorkPlanTable from "./WorkPlanTable";

export default async function WorkPlanView({ studentId }: { studentId: string }) {
  const plans = await prisma.workPlan.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return (
    <Suspense fallback={<h1 className="page-title">{markedTitle("План работы")}</h1>}>
      <WorkPlanTable studentId={studentId} initialPlans={plans} />
    </Suspense>
  );
}
