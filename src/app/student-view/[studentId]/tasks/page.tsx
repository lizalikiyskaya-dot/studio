import TasksView from "@/features/tasks/TasksView";

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <TasksView studentId={studentId} />;
}
