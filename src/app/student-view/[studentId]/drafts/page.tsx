import DraftsView from "@/features/drafts/DraftsView";

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <DraftsView studentId={studentId} />;
}
