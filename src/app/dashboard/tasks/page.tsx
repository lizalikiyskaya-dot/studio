import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import TasksView from "@/features/tasks/TasksView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <TasksView studentId={session.userId} />;
}
