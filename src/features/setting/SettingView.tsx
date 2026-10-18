import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import Subtabs from "@/components/Subtabs";
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

  const tabs = [
    {
      label: "Метод GRAPES",
      content: (
        <>
          <GrapesTable recordId={activeBook.id} values={activeBook} suggestions={suggestions[activeBook.id] ?? {}} />
          <ExtraGrapesList
            key={activeBook.id}
            bookId={activeBook.id}
            initialSettings={extraGrapes}
            suggestions={extraGrapesSuggestions}
          />
        </>
      ),
    },
    {
      label: "Тип сеттинга",
      content: <SettingTypeSection bookId={activeBook.id} book={activeBook} />,
    },
  ];

  if (isMentor || activeBook.fantasyUnlocked) {
    tabs.push({
      label: "Фэнтези мир",
      content: (
        <FantasySection
          bookId={activeBook.id}
          book={activeBook}
          initialEntries={worldEntries}
          isMentor={isMentor}
        />
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title="Сеттинг"
        description="Мир книги по методу GRAPES, тип сеттинга и, если нужно, фэнтези-мир."
        actions={<BookSelect books={books} activeBookId={activeBook.id} compact />}
      />
      <Subtabs tabs={tabs} />
    </div>
  );
}
