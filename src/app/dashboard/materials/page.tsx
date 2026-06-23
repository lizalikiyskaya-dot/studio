import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import MaterialsView from "@/features/materials/MaterialsView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <MaterialsView studentId={session.userId} />;
}
