import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import OpenCallsView from "@/features/openCalls/OpenCallsView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <OpenCallsView studentId={session.userId} />;
}
