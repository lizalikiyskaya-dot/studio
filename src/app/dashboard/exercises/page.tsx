import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ExercisesView from "@/features/exercises/ExercisesView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ExercisesView studentId={session.userId} />;
}
