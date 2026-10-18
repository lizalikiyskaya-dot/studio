import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import GrapesTable from "./GrapesTable";
import ExtraGrapesList from "./ExtraGrapesList";
import SettingTypeSection from "./SettingTypeSection";
import FantasySection from "./FantasySection";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import PageHeader from "@/components/PageHeader";

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
        <PageHeader title="Сеттинг" description="Мир книги по методу GRAPES, тип сеттинга и, если нужно, фэнтези-мир." />
        <NoBookRedirect aboutHref={`${basePath}/about`} />
      </div>
    );
  }

  const suggestions = await getSuggestionsForRecords("Book", [activeBook.id]);
  const bookSuggestions = suggestions[activeBook.id] ?? {};
  const extraGrapes = await prisma.grapesSetting.findMany({
    where: { bookId: activeBook.id },
    orderBy: { order: "asc" },
  });
  const extraGrapesSuggestions = await getSuggestionsForRecords(
    "GrapesSetting",
    extraGrapes.map((s) => s.id)
  );
  const worldEntries = await prisma.worldEntry.findMany({
    where: { bookId: activeBook.id },
    orderBy: { order: "asc" },
  });
  const session = await getSession();
  const isMentor = session?.role === "MENTOR";
  const showFantasy = isMentor || activeBook.fantasyUnlocked;

  return (
    <div>
      <PageHeader
        title="Сеттинг"
        description="Мир книги по методу GRAPES, тип сеттинга и, если нужно, фэнтези-мир."
        actions={<BookSelect books={books} activeBookId={activeBook.id} compact />}
      />

      <div className="mt-1 flex items-center gap-2">
        <h2 className="text-[17px] font-semibold">Метод GRAPES</h2>
        <span className="soon">скоро: подсказки и примеры</span>
      </div>
      <div className="mt-2.5">
        <GrapesTable recordId={activeBook.id} values={activeBook} suggestions={bookSuggestions} />
      </div>
      <ExtraGrapesList
        key={activeBook.id}
        bookId={activeBook.id}
        initialSettings={extraGrapes}
        suggestions={extraGrapesSuggestions}
      />

      <div className={`mt-4 grid grid-cols-1 gap-4 ${showFantasy ? "xl:grid-cols-[1.25fr_1fr]" : ""}`}>
        <SettingTypeSection bookId={activeBook.id} book={activeBook} suggestion={bookSuggestions.settingMix} />
        {showFantasy && (
          <FantasySection
            bookId={activeBook.id}
            book={activeBook}
            initialEntries={worldEntries}
            isMentor={isMentor}
          />
        )}
      </div>
    </div>
  );
}
