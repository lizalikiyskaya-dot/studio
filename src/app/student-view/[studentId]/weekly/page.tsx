import { loadWeekly } from "@/features/weekly/loadWeekly";
import WeeklyView from "@/features/weekly/WeeklyView";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
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
      today={data.today}
    />
  );
}
