import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DraftsView from "@/features/drafts/DraftsView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <DraftsView studentId={session.userId} />;
}
