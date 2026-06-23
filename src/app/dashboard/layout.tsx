import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";

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

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: "240px 1fr" }}>
      <Sidebar basePath="/dashboard" userName={user.name} isMentor={false} />
      <div className="px-12 py-10">{children}</div>
    </div>
  );
}
