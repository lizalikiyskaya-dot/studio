import CalendarView from "@/features/calendar/CalendarView";

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <CalendarView studentId={studentId} />;
}
