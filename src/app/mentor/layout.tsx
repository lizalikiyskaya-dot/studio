import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";

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

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Sidebar basePath="/mentor" userName={user.name} isMentor mentorMenuOnly />
      <div className="px-12 py-10 max-w-[860px]">{children}</div>
    </div>
  );
}
