import { resolveActiveBook } from "@/lib/resolveBook";
import BookSwitcher from "./BookSwitcher";
import NoBookYet from "./NoBookYet";
import AboutBookForm from "./AboutBookForm";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { getCommentsForRecords } from "@/features/comments/actions";
import PageHeader from "@/components/PageHeader";

export default async function AboutBookView({
  studentId,
  requestedBookId,
}: {
  studentId: string;
  requestedBookId?: string;
}) {
  const { books, activeBook } = await resolveActiveBook(studentId, requestedBookId);

  if (!activeBook) {
    return (
      <div>
        <PageHeader title="О книге" description="Замысел, жанр и рабочее название. Книгу можно сменить в любой момент." />
        <NoBookYet studentId={studentId} />
      </div>
    );
  }

  const suggestions = await getSuggestionsForRecords("Book", [activeBook.id]);
  const comments = await getCommentsForRecords("Book", [activeBook.id]);

  return (
    <div>
      <PageHeader
        title="О книге"
        description="Замысел, жанр и рабочее название. Отсюда же можно добавить ещё одну книгу."
        actions={<BookSwitcher studentId={studentId} books={books} activeBookId={activeBook.id} inline />}
      />
      <AboutBookForm
        book={activeBook}
        suggestions={suggestions[activeBook.id] ?? {}}
        comments={comments[activeBook.id] ?? []}
      />
    </div>
  );
}
