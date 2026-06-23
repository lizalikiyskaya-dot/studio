import { prisma } from "@/lib/prisma";
import TasksTable from "./TasksTable";

export default async function TasksView({ studentId }: { studentId: string }) {
  const tasks = await prisma.task.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="text-[24px] font-semibold mb-6">Задания и обратная связь</h1>
      <TasksTable studentId={studentId} initialTasks={tasks} />
    </div>
  );
}
