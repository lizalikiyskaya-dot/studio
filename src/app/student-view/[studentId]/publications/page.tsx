import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicationsPage from "@/features/publications/PublicationsPage";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { studentId } = await params;
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { role: true } });
  if (!student || student.role !== "STUDENT") notFound();
  const { tab } = await searchParams;
  return <PublicationsPage studentId={studentId} tab={tab === "tracker" ? "tracker" : "calls"} />;
}
