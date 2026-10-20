import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolveActiveBook } from "@/lib/resolveBook";
import BookSelect from "@/features/books/BookSelect";
import NoBookRedirect from "@/features/books/NoBookRedirect";
import SettingPhotoBanner from "./SettingPhotoBanner";
import SettingTypeSection from "./SettingTypeSection";
import WorldBible, { type BibleTable } from "./WorldBible";
import { GRAPES_FIELDS, type GrapesBag } from "./worldBible";
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
  const bookGrapes = pickGrapes(activeBook);
  const tables: BibleTable[] = [
    {
      id: "primary",
      title: (activeBook.grapesTitle ?? "").trim() || "Сеттинг 1",
      model: "Book",
      recordId: activeBook.id,
      values: bookGrapes,
      suggestions: bookSuggestions,
      titleField: "grapesTitle",
    },
    ...extraGrapes.map((setting, index) => ({
      id: setting.id,
      title: setting.title.trim() || `Сеттинг ${index + 2}`,
      model: "GrapesSetting" as const,
      recordId: setting.id,
      values: pickGrapes(setting),
      suggestions: extraGrapesSuggestions[setting.id] ?? {},
      titleField: "title" as const,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Сеттинг"
        actions={<BookSelect books={books} activeBookId={activeBook.id} compact />}
      />

      <div className="setting-stage mt-4">
        <div className="setting-top">
          <SettingPhotoBanner
            recordId={activeBook.id}
            photoUrl={activeBook.settingPhotoUrl}
            canEdit
            kind="setting-photo"
          />
          <div className="setting-stage-side">
            <SettingTypeSection bookId={activeBook.id} book={activeBook} suggestion={bookSuggestions.settingMix} />
          </div>
        </div>
        <WorldBible
          key={activeBook.id}
          scope="book"
          recordId={activeBook.id}
          tables={tables}
          entries={worldEntries}
          fantasyGeneral={activeBook.fantasyGeneral}
          fantasyNotes={activeBook.fantasyNotes}
          fantasySuggestions={bookSuggestions}
          canEdit
          allowTables
          isMentor={isMentor}
          unlocked={activeBook.fantasyUnlocked}
          photoKind="world-entry-photo"
        />
      </div>
    </div>
  );
}

function pickGrapes(source: GrapesBag): GrapesBag {
  const bag = {} as GrapesBag;
  for (const field of GRAPES_FIELDS) bag[field] = source[field] ?? "";
  return bag;
}
