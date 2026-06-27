import { prisma } from "@/lib/prisma";
import StoriesList from "./StoriesList";

export default async function StandaloneStoriesView({ studentId }: { studentId: string }) {
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
      <h1 className="page-title text-[24px] font-semibold mb-6">Отдельные рассказы</h1>
      <StoriesList
        cycleId={null}
        studentId={studentId}
        stories={stories}
        cycleCharacters={[]}
        cycleWorldEntries={[]}
        storyCharacters={storyCharacters}
        storyWorldEntries={storyWorldEntries}
      />
    </div>
  );
}
