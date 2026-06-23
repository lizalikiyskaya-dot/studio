import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import Subtabs from "@/components/Subtabs";
import GrapesTable from "./GrapesTable";
import SettingTypeSection from "./SettingTypeSection";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";

export default async function SettingView({
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
        <h1 className="page-title text-[24px] font-semibold mb-6">Сеттинг</h1>
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  const suggestions = await getSuggestionsForRecords("Book", [activeBook.id]);

  return (
    <div>
      <BookSelect books={books} activeBookId={activeBook.id} />
      <h1 className="page-title text-[24px] font-semibold mb-6">Сеттинг</h1>
      <Subtabs
        tabs={[
          {
            label: "Метод GRAPES",
            content: (
              <GrapesTable bookId={activeBook.id} book={activeBook} suggestions={suggestions[activeBook.id] ?? {}} />
            ),
          },
          {
            label: "Тип сеттинга",
            content: <SettingTypeSection bookId={activeBook.id} book={activeBook} />,
          },
        ]}
      />
    </div>
  );
}
