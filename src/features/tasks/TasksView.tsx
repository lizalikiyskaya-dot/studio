import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { markedTitle } from "@/components/markedTitle";
import { loadBadges } from "@/features/badges/load";
import { starAccount, starHistory, starPurchases } from "@/features/stars/award";
import { loadStreak } from "@/features/streak/load";
import { pendingWeeklyReviews, type WeeklyReview } from "@/features/weekly/review";
import { getSession } from "@/lib/session";
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
  const session = mentorView ? await getSession() : null;
  const [tasks, student, stars, streak, badges, purchases, history, weeklyReviews] = await Promise.all([
    prisma.task.findMany({
      where: { studentId },
      orderBy: { order: "asc" },
    }),
    prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }),
    starAccount(studentId),
    loadStreak(studentId),
    loadBadges(studentId),
    mentorView ? starPurchases(studentId) : Promise.resolve(null),
    starHistory(studentId),
    mentorView && session?.role === "MENTOR" ? loadWeeklyReviews(studentId, session.userId) : Promise.resolve([]),
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
        history={history}
      />
      <TasksTable
        studentId={studentId}
        initialTasks={tasks}
        isMentor={mentorView}
        weeklyReviews={weeklyReviews}
        banners={<StudioBanners studentId={studentId} basePath={basePath} />}
      />
    </Suspense>
  );
}

async function loadWeeklyReviews(studentId: string, mentorId: string): Promise<WeeklyReview[]> {
  const seen = await prisma.sectionSeen.findUnique({
    where: { userId_studentId_section: { userId: mentorId, studentId, section: "weekly" } },
    select: { seenAt: true },
  });
  const rows = await prisma.weeklySubmission.findMany({
    where: { studentId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      weeklyTaskId: true,
      text: true,
      updatedAt: true,
      weeklyTask: { select: { title: true } },
    },
  });
  return pendingWeeklyReviews(
    rows.map((row) => ({
      id: row.id,
      weeklyTaskId: row.weeklyTaskId,
      title: row.weeklyTask.title.trim() || "Задание недели",
      text: row.text,
      updatedAt: row.updatedAt.toISOString(),
    })),
    seen?.seenAt.toISOString() ?? null,
  );
}
