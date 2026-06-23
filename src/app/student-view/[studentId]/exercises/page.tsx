import ExercisesView from "@/features/exercises/ExercisesView";

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <ExercisesView studentId={studentId} isMentorViewer />;
}
