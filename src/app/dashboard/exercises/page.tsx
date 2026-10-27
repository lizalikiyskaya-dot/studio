import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ExercisesView from "@/features/exercises/ExercisesView";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { focus } = await searchParams;
  return <ExercisesView studentId={session.userId} isMentorViewer={false} focus={focus} />;
}
