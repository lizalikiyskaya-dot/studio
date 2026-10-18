import { notFound } from "next/navigation";
import { loadGuideForReader } from "@/lib/guides";
import GuideReader from "@/features/guides/GuideReader";
import { getSession } from "@/lib/session";

export default async function MentorGuideReaderPage({ params }: { params: Promise<{ guideId: string }> }) {
  const session = await getSession();
  const { guideId } = await params;
  const guide = await loadGuideForReader(guideId, { userId: session?.userId ?? "", asMentor: true });
  if (!guide) notFound();
  return <GuideReader guide={guide} backHref="/mentor/guides" backLabel="← к библиотеке" />;
}
