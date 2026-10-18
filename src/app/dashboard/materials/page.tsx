import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import MaterialsView from "@/features/materials/MaterialsView";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { tab } = await searchParams;
  return <MaterialsView studentId={session.userId} canManage={false} initialTab={tab === "handouts" ? 1 : 0} />;
}
