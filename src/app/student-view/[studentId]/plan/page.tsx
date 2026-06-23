import PlanBookView from "@/features/books/PlanBookView";

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
    <PlanBookView
      studentId={studentId}
      basePath={`/student-view/${studentId}`}
      requestedBookId={book}
    />
  );
}
