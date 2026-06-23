import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ArcsView from "@/features/characters/arcs/ArcsView";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { book } = await searchParams;
  return <ArcsView studentId={session.userId} basePath="/dashboard" requestedBookId={book} />;
}
