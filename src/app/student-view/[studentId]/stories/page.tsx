import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import StandaloneStoriesView from "@/features/stories/StandaloneStoriesView";

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MENTOR") redirect("/dashboard/tasks");

  const { studentId } = await params;
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== "STUDENT") notFound();

  return <StandaloneStoriesView studentId={studentId} />;
}
