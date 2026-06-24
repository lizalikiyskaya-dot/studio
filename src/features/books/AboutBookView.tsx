import { resolveActiveBook } from "@/lib/resolveBook";
import BookSwitcher from "./BookSwitcher";
import NoBookYet from "./NoBookYet";
import AboutBookForm from "./AboutBookForm";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { getCommentsForRecords } from "@/features/comments/actions";

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
        <h1 className="page-title text-[24px] font-semibold mb-6">О книге</h1>
        <NoBookYet studentId={studentId} />
      </div>
    );
  }

  const suggestions = await getSuggestionsForRecords("Book", [activeBook.id]);
  const comments = await getCommentsForRecords("Book", [activeBook.id]);

  return (
    <div>
      <BookSwitcher studentId={studentId} books={books} activeBookId={activeBook.id} />
      <h1 className="page-title text-[24px] font-semibold mb-6">О книге</h1>
      <AboutBookForm
        book={activeBook}
        suggestions={suggestions[activeBook.id] ?? {}}
        comments={comments[activeBook.id] ?? []}
      />
    </div>
  );
}
