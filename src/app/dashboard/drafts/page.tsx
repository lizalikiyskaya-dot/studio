import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DraftsView from "@/features/drafts/DraftsView";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ part?: string; book?: string; focus?: string; chapter?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const params = await searchParams;
  return (
    <DraftsView
      studentId={session.userId}
      part={params.part === "files" ? "files" : "write"}
      requestedBookId={params.book}
      focusChapterId={params.chapter}
      startFocus={params.focus === "1"}
    />
  );
}
