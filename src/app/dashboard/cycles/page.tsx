import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import CyclesView from "@/features/cycles/CyclesView";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!user.storyWorkshopUnlocked) redirect("/dashboard/tasks");

  const { cycle } = await searchParams;
  return <CyclesView studentId={session.userId} requestedCycleId={cycle} />;
}
