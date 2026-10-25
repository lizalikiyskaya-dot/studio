import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadWeekly } from "@/features/weekly/loadWeekly";
import WeeklyView from "@/features/weekly/WeeklyView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await loadWeekly(session.userId);
  return (
    <WeeklyView
      studentId={session.userId}
      canSubmit
      isMentor={false}
      tasks={data.tasks}
      submissions={data.submissions}
      account={data.account}
      today={data.today}
    />
  );
}
