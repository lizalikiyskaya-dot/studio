import SubmissionsView from "@/features/submissions/SubmissionsView";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <SubmissionsView studentId={studentId} />;
}
