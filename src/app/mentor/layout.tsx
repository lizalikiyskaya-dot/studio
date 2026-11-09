import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import { loadMentorFeed } from "@/lib/mentorFeedLoad";

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MENTOR") redirect("/dashboard/tasks");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  const feed = await loadMentorFeed(session.userId);

  return (
    <Sidebar basePath="/mentor" userName={user.name} isMentor mentorMenuOnly avatarUrl={user.avatarUrl} feed={feed}>
      {children}
    </Sidebar>
  );
}
