import { prisma } from "@/lib/prisma";
import CalendarScreen from "./CalendarScreen";

export default async function CalendarView({ studentId }: { studentId: string }) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: studentId },
    select: { paymentDay: true, paymentStatus: true },
  });
  const tasks = await prisma.task.findMany({
    where: { studentId, deadline: { not: null } },
    select: { id: true, title: true, deadline: true },
    orderBy: { deadline: "asc" },
  });

  return (
    <CalendarScreen
      tasks={tasks.map((task) => ({ id: task.id, title: task.title, deadline: task.deadline!.toISOString() }))}
      paymentDay={user.paymentDay}
      paymentStatus={user.paymentStatus}
    />
  );
}
