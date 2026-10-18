import MaterialsView from "@/features/materials/MaterialsView";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { studentId } = await params;
  const { tab } = await searchParams;
  return <MaterialsView studentId={studentId} canManage initialTab={tab === "handouts" ? 1 : 0} />;
}
