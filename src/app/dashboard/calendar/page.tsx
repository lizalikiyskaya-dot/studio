import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CalendarView from "@/features/calendar/CalendarView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <CalendarView studentId={session.userId} />;
}
