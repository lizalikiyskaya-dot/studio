import ExercisesView from "@/features/exercises/ExercisesView";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { studentId } = await params;
  const { focus } = await searchParams;
  return <ExercisesView studentId={studentId} isMentorViewer focus={focus} />;
}
