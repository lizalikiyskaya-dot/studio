import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import NotesPanel from "@/features/notes/NotesPanel";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  if (user.role === "MENTOR") redirect("/mentor");
  if (user.status !== "APPROVED") redirect("/pending");

  const [tasks, notes] = await Promise.all([
    prisma.task.findMany({
      where: { studentId: user.id, deadline: { not: null } },
      select: { id: true, title: true, deadline: true },
    }),
    prisma.note.findMany({ where: { studentId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="flex min-h-screen gap-5 p-5 mx-auto" style={{ maxWidth: 1320 }}>
      <div style={{ width: 250, flexShrink: 0 }}>
        <Sidebar
          basePath="/dashboard"
          userName={user.name}
          isMentor={false}
          calendar={{
            tasks: tasks.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline!.toISOString() })),
            paymentDay: user.paymentDay,
            paymentStatus: user.paymentStatus,
          }}
        />
      </div>
      <div className="page-card px-[46px] py-10" style={{ flex: 1, minHeight: "calc(100vh - 40px)" }}>
        {children}
      </div>
      <NotesPanel studentId={user.id} initialNotes={notes} />
    </div>
  );
}
