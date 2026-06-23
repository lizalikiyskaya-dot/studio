import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AboutBookView from "@/features/books/AboutBookView";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { book } = await searchParams;
  return <AboutBookView studentId={session.userId} requestedBookId={book} />;
}
