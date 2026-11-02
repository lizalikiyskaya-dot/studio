import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PublicationsPage from "@/features/publications/PublicationsPage";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { tab } = await searchParams;
  return <PublicationsPage studentId={session.userId} tab={tab === "tracker" ? "tracker" : "calls"} />;
}
