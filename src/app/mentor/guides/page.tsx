import { loadLibrary } from "@/lib/guides";
import GuidesLibrary from "@/features/guides/GuidesLibrary";
import { markedTitle } from "@/components/markedTitle";

export default async function MentorGuidesPage() {
  const library = await loadLibrary();

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="page-title mt-1 mb-4">{markedTitle("Методички")}</h1>

      {library.ready ? (
        <GuidesLibrary initialGuides={library.guides} studentCount={library.studentCount} />
      ) : (
        <div className="rounded-[24px] px-5 py-4" style={{ background: "var(--soft)" }}>
          <p className="text-[15px]" style={{ color: "var(--ink)" }}>
            Библиотека ещё не подключена. Личные методички учеников на месте, ничего не пропало.
          </p>
          <p className="text-[14px] mt-2" style={{ color: "var(--ink2)" }}>
            Михаилу нужно один раз выполнить файл docs/sql/2026-10-guides-library.sql и обновить эту страницу.
          </p>
        </div>
      )}
    </div>
  );
}
