import ArcsView from "@/features/characters/arcs/ArcsView";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ book?: string }>;
}) {
  const { studentId } = await params;
  const { book } = await searchParams;
  return <ArcsView studentId={studentId} basePath={`/student-view/${studentId}`} requestedBookId={book} />;
}
