import WorkPlanView from "@/features/workPlan/WorkPlanView";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <WorkPlanView studentId={studentId} />;
}
