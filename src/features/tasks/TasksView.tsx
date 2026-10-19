import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { markedTitle } from "@/components/markedTitle";
import TasksTable from "./TasksTable";
import CabinetHello from "./CabinetHello";
import StudioBanners from "@/components/StudioBanners";

export default async function TasksView({
  studentId,
  basePath,
}: {
  studentId: string;
  basePath: string;
}) {
  const [tasks, student] = await Promise.all([
    prisma.task.findMany({
      where: { studentId },
      orderBy: { order: "asc" },
    }),
    prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }),
  ]);

  return (
    <Suspense fallback={<h1 className="page-title">{markedTitle("Задания")}</h1>}>
      <CabinetHello name={student?.name ?? ""} tasks={tasks} />
      <TasksTable
        studentId={studentId}
        initialTasks={tasks}
        banners={<StudioBanners studentId={studentId} basePath={basePath} />}
      />
    </Suspense>
  );
}
