import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import StandaloneStoriesView from "@/features/stories/StandaloneStoriesView";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!user.storyWorkshopUnlocked) redirect("/dashboard/tasks");

  return <StandaloneStoriesView studentId={session.userId} />;
}
