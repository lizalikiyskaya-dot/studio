import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PlanBookView from "@/features/books/PlanBookView";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { book } = await searchParams;
  return <PlanBookView studentId={session.userId} basePath="/dashboard" requestedBookId={book} />;
}
