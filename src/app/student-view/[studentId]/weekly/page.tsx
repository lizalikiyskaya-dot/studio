import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadWeekly } from "@/features/weekly/loadWeekly";
import WeeklyView from "@/features/weekly/WeeklyView";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { studentId } = await params;
  const data = await loadWeekly(studentId);
  return (
    <WeeklyView
      studentId={studentId}
      canSubmit={false}
      isMentor
      tasks={data.tasks}
      submissions={data.submissions}
      account={data.account}
      streak={data.streak}
      today={data.today}
      viewerId={session.userId}
    />
  );
}
