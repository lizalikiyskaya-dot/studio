import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import SubmissionsView from "@/features/submissions/SubmissionsView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <SubmissionsView studentId={session.userId} />;
}
