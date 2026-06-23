import CharactersView from "@/features/characters/CharactersView";
import { DOSSIER_GROUPS } from "@/features/characters/fields";

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
      title="Досье персонажей"
      groups={DOSSIER_GROUPS}
    />
  );
}
