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
import SuggestableField from "@/features/suggestions/SuggestableField";
import PageHeader from "@/components/PageHeader";
import { GrapesSection } from "@/components/GrapesLetterCard";

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
        <PageHeader title="Сеттинг" />
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
        actions={<BookSelect books={books} activeBookId={activeBook.id} compact />}
      />

      <GrapesSection>
        <div className="mt-2.5">
          <div className="mb-2">
            <SuggestableField
              model="Book"
              recordId={activeBook.id}
              field="grapesTitle"
              value={(activeBook.grapesTitle ?? "").trim() ? activeBook.grapesTitle : "Сеттинг 1"}
              suggestion={bookSuggestions.grapesTitle}
              as="input"
              className="heading w-full bg-transparent text-[16px] font-semibold outline-none border-b pb-1"
              style={{ borderColor: "var(--rule)" }}
            />
          </div>
          <GrapesTable recordId={activeBook.id} values={activeBook} suggestions={bookSuggestions} />
        </div>
        <ExtraGrapesList
          key={activeBook.id}
          bookId={activeBook.id}
          initialSettings={extraGrapes}
          suggestions={extraGrapesSuggestions}
        />
      </GrapesSection>

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
