import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import CharactersView from "@/features/characters/CharactersView";
import { DOSSIER_GROUPS } from "@/features/characters/fields";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!user.bookWorkshopUnlocked) redirect("/dashboard/tasks");
  const { book } = await searchParams;
  return (
    <CharactersView
      studentId={session.userId}
      basePath="/dashboard"
      requestedBookId={book}
      title="Досье персонажей"
      groups={DOSSIER_GROUPS}
    />
  );
}
