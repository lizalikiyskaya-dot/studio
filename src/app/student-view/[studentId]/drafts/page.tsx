import DraftsView from "@/features/drafts/DraftsView";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ part?: string; book?: string; focus?: string; chapter?: string }>;
}) {
  const { studentId } = await params;
  const query = await searchParams;
  return (
    <DraftsView
      studentId={studentId}
      readOnly
      manuscriptReadOnly={false}
      part={query.part === "files" ? "files" : "write"}
      requestedBookId={query.book}
      focusChapterId={query.chapter}
      startFocus={query.focus === "1"}
    />
  );
}
