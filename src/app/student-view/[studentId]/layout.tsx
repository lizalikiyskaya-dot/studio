import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import NotesPanel from "@/features/notes/NotesPanel";
import SectionTracker from "@/features/sectionBeacons/SectionTracker";
import { getSectionBeacons } from "@/features/sectionBeacons/actions";
import { getCommentsForRecords } from "@/features/comments/actions";
import { SuggestionProvider } from "@/features/suggestions/SuggestionContext";
import { loadWorkshopBooks } from "@/lib/workshopBooks";
import { loadWorkshopCycles } from "@/lib/workshopCycles";

export default async function StudentViewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ studentId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MENTOR") redirect("/dashboard/tasks");

  const { studentId } = await params;
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      role: true,
      reviewModeEnabled: true,
      bookWorkshopUnlocked: true,
      storyWorkshopUnlocked: true,
      paymentDay: true,
      paymentStatus: true,
    },
  });
  if (!student || student.role !== "STUDENT") notFound();

  const [tasks, notes, books, cycles] = await Promise.all([
    prisma.task.findMany({
      where: { studentId: student.id, deadline: { not: null } },
      select: { id: true, title: true, deadline: true },
    }),
    prisma.note.findMany({ where: { studentId: student.id }, orderBy: { createdAt: "desc" } }),
    loadWorkshopBooks(student.id),
    loadWorkshopCycles(student.id),
  ]);
  const [noteComments, beacons] = await Promise.all([
    getCommentsForRecords("Note", notes.map((n) => n.id)),
    getSectionBeacons(student.id),
  ]);

  return (
    <SuggestionProvider canSuggest={student.reviewModeEnabled}>
      <SectionTracker studentId={student.id} basePath={`/student-view/${studentId}`} />
      <Sidebar
        basePath={`/student-view/${studentId}`}
        userName={student.name}
        isMentor
        mentorViewLabel={student.name}
        studentId={student.id}
        beacons={beacons}
        notesCount={notes.length}
        bookWorkshopUnlocked={student.bookWorkshopUnlocked}
        storyWorkshopUnlocked={student.storyWorkshopUnlocked}
        books={books}
        cycles={cycles}
        calendar={{
          tasks: tasks.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline!.toISOString() })),
          paymentDay: student.paymentDay,
          paymentStatus: student.paymentStatus,
        }}
      >
        {children}
      </Sidebar>
      <NotesPanel studentId={student.id} initialNotes={notes} initialComments={noteComments} />
    </SuggestionProvider>
  );
}
