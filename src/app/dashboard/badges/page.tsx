import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import BadgeGallery from "@/features/badges/BadgeGallery";
import { loadBadges } from "@/features/badges/load";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await loadBadges(session.userId);
  return <BadgeGallery studentId={session.userId} data={data} play canManage={false} />;
}
