import { Prisma } from "@/generated/prisma/client";
import PageHeader from "@/components/PageHeader";
import WeeklyAdmin, { type WeeklyAdminRow } from "@/features/weekly/WeeklyAdmin";
import { moscowToday, pickWeekly, weekPhase } from "@/features/weekly/schedule";
import { prisma } from "@/lib/prisma";

function missing(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

export default async function MentorWeeklyAdminPage() {
  const today = moscowToday();
  let ready = true;
  let tasks: WeeklyAdminRow[] = [];
  try {
    const rows = await prisma.weeklyTask.findMany({
      orderBy: [{ publishedOn: "asc" }, { id: "asc" }],
      include: { _count: { select: { submissions: true } } },
    });
    const { current } = pickWeekly(rows, today);
    tasks = rows.map((row) => ({
      id: row.id,
      publishedOn: row.publishedOn,
      title: row.title,
      prompt: row.prompt,
      lengthHint: row.lengthHint,
      sortOrder: row.sortOrder,
      submissions: row._count.submissions,
      phase: weekPhase(row, today, current?.id ?? null),
    }));
  } catch (error) {
    if (!missing(error)) throw error;
    ready = false;
  }

  return (
    <div>
      <PageHeader
        title="Задания недели"
        description="Тексты субботних заданий. Ученик видит их в разделе «Задание недели» и получает 2 звёздочки за сдачу. Письма отсюда не уходят."
      />
      {ready ? (
        <WeeklyAdmin tasks={tasks} today={today} />
      ) : (
        <div className="rounded-[24px] px-5 py-4" style={{ background: "var(--soft)", maxWidth: 720 }}>
          <p className="text-[15px]">Задания недели ещё не подключены. После обновления сайта список появится здесь.</p>
        </div>
      )}
    </div>
  );
}
