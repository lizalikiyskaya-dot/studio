import MaterialsView from "@/features/materials/MaterialsView";

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <MaterialsView studentId={studentId} />;
}
