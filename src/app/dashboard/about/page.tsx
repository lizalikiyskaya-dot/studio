import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AboutBookView from "@/features/books/AboutBookView";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!user.bookWorkshopUnlocked) redirect("/dashboard/tasks");
  const { book } = await searchParams;
  return <AboutBookView studentId={session.userId} requestedBookId={book} />;
}
