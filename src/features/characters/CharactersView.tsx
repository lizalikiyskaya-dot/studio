import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import CharactersList from "./CharactersList";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import type { FieldGroup } from "./fields";

export default async function CharactersView({
  studentId,
  basePath,
  requestedBookId,
  title,
  groups,
}: {
  studentId: string;
  basePath: string;
  requestedBookId?: string;
  title: string;
  groups: FieldGroup[];
}) {
  const { books, activeBook } = await resolveActiveBook(studentId, requestedBookId);

  if (!activeBook) {
    return (
      <div>
        <h1 className="page-title text-[24px] font-semibold mb-6">{title}</h1>
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  const characters = await prisma.character.findMany({
    where: { bookId: activeBook.id },
    orderBy: { order: "asc" },
  });
  const suggestions = await getSuggestionsForRecords("Character", characters.map((c) => c.id));

  return (
    <div>
      <BookSelect books={books} activeBookId={activeBook.id} />
      <h1 className="page-title text-[24px] font-semibold mb-6">{title}</h1>
      <CharactersList bookId={activeBook.id} initialCharacters={characters} groups={groups} suggestions={suggestions} />
    </div>
  );
}
