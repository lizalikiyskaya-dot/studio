import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import CharactersView from "@/features/characters/CharactersView";
import { ARC_GROUPS } from "@/features/characters/fields";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { book } = await searchParams;
  return (
    <CharactersView
      studentId={session.userId}
      basePath="/dashboard"
      requestedBookId={book}
      title="Арки персонажей"
      groups={ARC_GROUPS}
    />
  );
}
