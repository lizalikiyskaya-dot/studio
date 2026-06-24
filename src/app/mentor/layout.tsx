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
    <div className="grid min-h-screen gap-5 p-5 mx-auto" style={{ gridTemplateColumns: "250px 1fr", maxWidth: 1320 }}>
      <Sidebar basePath="/mentor" userName={user.name} isMentor mentorMenuOnly />
      <div className="page-card px-[46px] py-10 max-w-[860px]" style={{ minHeight: "calc(100vh - 40px)" }}>
        {children}
      </div>
    </div>
  );
}
