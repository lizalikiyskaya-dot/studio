import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import WorkPlanView from "@/features/workPlan/WorkPlanView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <WorkPlanView studentId={session.userId} />;
}
