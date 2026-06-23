import CharactersView from "@/features/characters/CharactersView";
import { ARC_GROUPS } from "@/features/characters/fields";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ book?: string }>;
}) {
  const { studentId } = await params;
  const { book } = await searchParams;
  return (
    <CharactersView
      studentId={studentId}
      basePath={`/student-view/${studentId}`}
      requestedBookId={book}
      title="Арки персонажей"
      groups={ARC_GROUPS}
    />
  );
}
