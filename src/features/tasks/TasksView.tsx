import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { markedTitle } from "@/components/markedTitle";
import { loadBadges } from "@/features/badges/load";
import { starAccount, starPurchases } from "@/features/stars/award";
import { loadStreak } from "@/features/streak/load";
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
  const mentorView = basePath !== "/dashboard";
  const [tasks, student, stars, streak, badges, purchases] = await Promise.all([
    prisma.task.findMany({
      where: { studentId },
      orderBy: { order: "asc" },
    }),
    prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }),
    starAccount(studentId),
    loadStreak(studentId),
    loadBadges(studentId),
    mentorView ? starPurchases(studentId) : Promise.resolve(null),
  ]);

  return (
    <Suspense fallback={<h1 className="page-title">{markedTitle("Задания")}</h1>}>
      <CabinetHello
        name={student?.name ?? ""}
        tasks={tasks}
        studentId={studentId}
        stars={stars}
        streak={streak}
        playStars={basePath === "/dashboard"}
        basePath={basePath}
        badgeWidget={badges.widget}
        badgeLine={badges.line}
        purchases={purchases}
      />
      <TasksTable
        studentId={studentId}
        initialTasks={tasks}
        isMentor={mentorView}
        banners={<StudioBanners studentId={studentId} basePath={basePath} />}
      />
    </Suspense>
  );
}
