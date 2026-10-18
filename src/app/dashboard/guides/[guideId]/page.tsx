import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { loadGuideForReader } from "@/lib/guides";
import GuideReader from "@/features/guides/GuideReader";

export default async function StudentGuideReaderPage({ params }: { params: Promise<{ guideId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, status: true },
  });
  if (!user || user.role !== "STUDENT" || user.status !== "APPROVED") redirect("/login");

  const { guideId } = await params;
  const guide = await loadGuideForReader(guideId, { userId: session.userId, asMentor: false });
  if (!guide) {
    return (
      <div style={{ maxWidth: 640 }}>
        <h1 className="page-title mb-3">Такой страницы нет</h1>
        <p className="text-[15.5px] mb-4" style={{ color: "var(--ink2)" }}>
          Вернитесь к своим материалам.
        </p>
        <Link href="/dashboard/materials?tab=handouts" className="lnk text-[14.5px]">
          ← к материалам
        </Link>
      </div>
    );
  }
  return <GuideReader guide={guide} backHref="/dashboard/materials?tab=handouts" backLabel="← к материалам" />;
}
