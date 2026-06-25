import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import NotesPanel from "@/features/notes/NotesPanel";
import { getCommentsForRecords } from "@/features/comments/actions";
import { SuggestionProvider } from "@/features/suggestions/SuggestionContext";

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
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT") notFound();

  const [tasks, notes] = await Promise.all([
    prisma.task.findMany({
      where: { studentId: student.id, deadline: { not: null } },
      select: { id: true, title: true, deadline: true },
    }),
    prisma.note.findMany({ where: { studentId: student.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const noteComments = await getCommentsForRecords("Note", notes.map((n) => n.id));

  return (
    <SuggestionProvider canSuggest={student.reviewModeEnabled}>
      <div className="flex min-h-screen gap-5 p-5 mx-auto" style={{ maxWidth: 1320 }}>
        <div style={{ width: 250, flexShrink: 0 }}>
          <Sidebar
            basePath={`/student-view/${studentId}`}
            userName={student.name}
            isMentor
            mentorViewLabel={student.name}
            studentId={student.id}
            calendar={{
              tasks: tasks.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline!.toISOString() })),
              paymentDay: student.paymentDay,
              paymentStatus: student.paymentStatus,
            }}
          />
        </div>
        <div className="page-card px-[46px] py-10" style={{ flex: 1, minHeight: "calc(100vh - 40px)" }}>
          {children}
        </div>
        <NotesPanel studentId={student.id} initialNotes={notes} initialComments={noteComments} />
      </div>
    </SuggestionProvider>
  );
}
