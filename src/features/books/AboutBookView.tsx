import { resolveActiveBook } from "@/lib/resolveBook";
import BookSwitcher from "./BookSwitcher";
import NoBookYet from "./NoBookYet";
import AboutBookForm from "./AboutBookForm";

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
        <h1 className="text-[24px] font-semibold mb-6">О книге</h1>
        <NoBookYet studentId={studentId} />
      </div>
    );
  }

  return (
    <div>
      <BookSwitcher studentId={studentId} books={books} activeBookId={activeBook.id} />
      <h1 className="text-[24px] font-semibold mb-6">О книге</h1>
      <AboutBookForm book={activeBook} />
    </div>
  );
}
