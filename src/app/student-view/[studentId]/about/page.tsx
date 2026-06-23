import AboutBookView from "@/features/books/AboutBookView";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ book?: string }>;
}) {
  const { studentId } = await params;
  const { book } = await searchParams;
  return <AboutBookView studentId={studentId} requestedBookId={book} />;
}
