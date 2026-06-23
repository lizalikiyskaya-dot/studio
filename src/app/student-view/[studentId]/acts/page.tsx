import ActsView from "@/features/acts/ActsView";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ book?: string }>;
}) {
  const { studentId } = await params;
  const { book } = await searchParams;
  return (
    <ActsView
      studentId={studentId}
      basePath={`/student-view/${studentId}`}
      requestedBookId={book}
    />
  );
}
