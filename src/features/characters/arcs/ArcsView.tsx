import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import ArcCharactersList from "./ArcCharactersList";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";

export default async function ArcsView({
  studentId,
  basePath,
  requestedBookId,
}: {
  studentId: string;
  basePath: string;
  requestedBookId?: string;
}) {
  const { books, activeBook } = await resolveActiveBook(studentId, requestedBookId);

  if (!activeBook) {
    return (
      <div>
        <h1 className="text-[24px] font-semibold mb-6">Арки персонажей</h1>
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
      <h1 className="text-[24px] font-semibold mb-6">Арки персонажей</h1>
      <ArcCharactersList bookId={activeBook.id} initialCharacters={characters} suggestions={suggestions} />
    </div>
  );
}
