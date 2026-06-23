import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";

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

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Sidebar
        basePath={`/student-view/${studentId}`}
        userName={student.name}
        isMentor
        mentorViewLabel={student.name}
      />
      <div className="px-12 py-10">{children}</div>
    </div>
  );
}
