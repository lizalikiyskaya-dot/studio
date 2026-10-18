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
    <div className="studio-shell flex min-h-screen">
      <Sidebar basePath="/mentor" userName={user.name} isMentor mentorMenuOnly avatarUrl={user.avatarUrl} />
      <div className="studio-content min-w-0 px-4 py-6 sm:px-6 lg:px-11 lg:py-9" style={{ flex: 1, background: "var(--paper-light)", minHeight: "100vh" }}>
        {children}
      </div>
    </div>
  );
}
