import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import TasksTable from "./TasksTable";
import StudioBanners from "@/components/StudioBanners";

export default async function TasksView({
  studentId,
  basePath,
}: {
  studentId: string;
  basePath: string;
}) {
  const tasks = await prisma.task.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return (
    <Suspense fallback={<h1 className="page-title">Задания</h1>}>
      <TasksTable
        studentId={studentId}
        initialTasks={tasks}
        banners={<StudioBanners studentId={studentId} basePath={basePath} />}
      />
    </Suspense>
  );
}
