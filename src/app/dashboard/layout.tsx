import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import NotesPanel from "@/features/notes/NotesPanel";
import PresencePing from "@/features/presence/PresencePing";
import SectionTracker from "@/features/sectionBeacons/SectionTracker";
import { getSectionBeacons } from "@/features/sectionBeacons/actions";
import { getCommentsForRecords } from "@/features/comments/actions";

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
  const noteComments = await getCommentsForRecords("Note", notes.map((n) => n.id));
  const beacons = await getSectionBeacons(user.id);

  return (
    <div className="flex min-h-screen">
      <SectionTracker studentId={user.id} basePath="/dashboard" />
      <Sidebar
        basePath="/dashboard"
        userName={user.name}
        isMentor={false}
        studentId={user.id}
        avatarUrl={user.avatarUrl}
        beacons={beacons}
        bookWorkshopUnlocked={user.bookWorkshopUnlocked}
        storyWorkshopUnlocked={user.storyWorkshopUnlocked}
        calendar={{
          tasks: tasks.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline!.toISOString() })),
          paymentDay: user.paymentDay,
          paymentStatus: user.paymentStatus,
        }}
      />
      <div className="px-11 py-9" style={{ flex: 1, background: "var(--paper-light)", minHeight: "100vh" }}>
        {children}
      </div>
      <NotesPanel studentId={user.id} initialNotes={notes} initialComments={noteComments} />
      <PresencePing />
    </div>
  );
}
