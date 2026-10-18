import { prisma } from "@/lib/prisma";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import CharactersList from "./CharactersList";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { getCommentsForRecords } from "@/features/comments/actions";
import type { FieldGroup } from "./fields";
import { SECONDARY_CHARACTER_GROUPS } from "./fields";
import PageHeader from "@/components/PageHeader";
import { HeaderButton } from "@/components/headerAction";
import { Plus } from "lucide-react";

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
        <PageHeader title={title} description="Анкета для каждого героя: от привычек до трансформации." />
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  const characters = await prisma.character.findMany({
    where: { bookId: activeBook.id },
    orderBy: { order: "asc" },
  });
  const suggestions = await getSuggestionsForRecords("Character", characters.map((c) => c.id));
  const comments = await getCommentsForRecords("Character", characters.map((c) => c.id));

  return (
    <div>
      <PageHeader
        title={title}
        description="Анкета для каждого героя: от привычек до трансформации."
        actions={
          <>
            <BookSelect books={books} activeBookId={activeBook.id} compact />
            <HeaderButton actionId="char-secondary" tone="soft"><Plus size={16} /> Второстепенный</HeaderButton>
            <HeaderButton actionId="char-main"><Plus size={16} /> Главный персонаж</HeaderButton>
          </>
        }
      />
      <CharactersList
        bookId={activeBook.id}
        initialCharacters={characters}
        mainGroups={groups}
        secondaryGroups={SECONDARY_CHARACTER_GROUPS}
        suggestions={suggestions}
        comments={comments}
      />
    </div>
  );
}
