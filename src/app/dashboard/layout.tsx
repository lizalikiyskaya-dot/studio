import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import NotesPanel from "@/features/notes/NotesPanel";
import PresencePing from "@/features/presence/PresencePing";
import SectionTracker from "@/features/sectionBeacons/SectionTracker";
import { getSectionBeacons } from "@/features/sectionBeacons/actions";
import { getCommentsForRecords } from "@/features/comments/actions";
import { userAvatarPath } from "@/lib/cabinetImage";
import { loadWorkshopBooks } from "@/lib/workshopBooks";
import { loadWorkshopCycles } from "@/lib/workshopCycles";
import { loadDailyQuote } from "@/lib/loadDailyQuote";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, avatar] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        reviewModeEnabled: true,
        bookWorkshopUnlocked: true,
        storyWorkshopUnlocked: true,
        paymentDay: true,
        paymentStatus: true,
      },
    }),
    prisma.$queryRaw<Array<{ has: boolean }>>`
      SELECT ("avatarUrl" IS NOT NULL) AS has FROM "User" WHERE id = ${session.userId}
    `,
  ]);
  if (!user) redirect("/login");
  if (user.role === "MENTOR") redirect("/mentor");
  if (user.status !== "APPROVED") redirect("/pending");

  const [tasks, notes, books, cycles, dailyQuote] = await Promise.all([
    prisma.task.findMany({
      where: { studentId: user.id, deadline: { not: null } },
      select: { id: true, title: true, deadline: true },
    }),
    prisma.note.findMany({ where: { studentId: user.id }, orderBy: { createdAt: "desc" } }),
    loadWorkshopBooks(user.id),
    loadWorkshopCycles(user.id),
    loadDailyQuote(),
  ]);
  const [noteComments, beacons] = await Promise.all([
    getCommentsForRecords("Note", notes.map((n) => n.id)),
    getSectionBeacons(user.id),
  ]);

  return (
    <>
      <SectionTracker studentId={user.id} basePath="/dashboard" />
      <Sidebar
        basePath="/dashboard"
        userName={user.name}
        isMentor={false}
        studentId={user.id}
        avatarUrl={avatar[0]?.has ? userAvatarPath(user.id) : null}
        beacons={beacons}
        notesCount={notes.length}
        bookWorkshopUnlocked={user.bookWorkshopUnlocked}
        storyWorkshopUnlocked={user.storyWorkshopUnlocked}
        books={books}
        cycles={cycles}
        dailyQuote={dailyQuote}
        calendar={{
          tasks: tasks.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline!.toISOString() })),
          paymentDay: user.paymentDay,
          paymentStatus: user.paymentStatus,
        }}
      >
        {children}
      </Sidebar>
      <NotesPanel studentId={user.id} initialNotes={notes} initialComments={noteComments} />
      <PresencePing />
    </>
  );
}
