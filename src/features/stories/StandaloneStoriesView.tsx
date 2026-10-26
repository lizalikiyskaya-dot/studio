import { prisma } from "@/lib/prisma";
import StoriesList from "./StoriesList";
import PageHeader from "@/components/PageHeader";
import { HeaderButton } from "@/components/headerAction";
import { Plus } from "lucide-react";

export default async function StandaloneStoriesView({
  studentId,
  canReview = false,
}: {
  studentId: string;
  canReview?: boolean;
}) {
  const stories = await prisma.story.findMany({
    where: { studentId, cycleId: null },
    orderBy: { order: "asc" },
  });
  const storyIds = stories.map((s) => s.id);
  const [storyCharacters, storyWorldEntries] = await Promise.all([
    prisma.storyCharacter.findMany({ where: { storyId: { in: storyIds } }, orderBy: { order: "asc" } }),
    prisma.storyWorldEntry.findMany({ where: { storyId: { in: storyIds } }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Отдельные рассказы"
        actions={<HeaderButton actionId="story-add"><Plus size={16} /> Новый рассказ</HeaderButton>}
      />
      <StoriesList
        cycleId={null}
        studentId={studentId}
        stories={stories}
        cycleCharacters={[]}
        cycleWorldEntries={[]}
        storyCharacters={storyCharacters}
        storyWorldEntries={storyWorldEntries}
        headerAdd
        canReview={canReview}
      />
    </div>
  );
}
