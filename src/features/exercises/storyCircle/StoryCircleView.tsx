import { prisma } from "@/lib/prisma";
import Subtabs from "@/components/Subtabs";
import { StoryCircleExamplesList, StoryCircleOwnList } from "./StoryCircleList";
import { STORY_CIRCLE_SEED } from "./seedData";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { getCommentsForRecords } from "@/features/comments/actions";
import { attachPortrait, photoIds } from "@/lib/portraits";

export default async function StoryCircleView({
  studentId,
  isMentorViewer,
}: {
  studentId: string;
  isMentorViewer: boolean;
}) {
  let examples = await prisma.storyCircleCard.findMany({
    where: { studentId, isExample: true },
    orderBy: { order: "asc" },
    omit: { photoUrl: true },
  });

  if (examples.length === 0) {
    await prisma.storyCircleCard.createMany({
      data: STORY_CIRCLE_SEED.map((seed, i) => ({
        studentId,
        order: i,
        isExample: true,
        hero: seed.hero,
        data: seed.data,
      })),
    });
    examples = await prisma.storyCircleCard.findMany({
      where: { studentId, isExample: true },
      orderBy: { order: "asc" },
      omit: { photoUrl: true },
    });
  }

  const [ownCards, portraits] = await Promise.all([
    prisma.storyCircleCard.findMany({
      where: { studentId, isExample: false },
      orderBy: { order: "asc" },
      omit: { photoUrl: true },
    }),
    photoIds("story-circle", studentId),
  ]);
  const exampleCards = attachPortrait(examples, portraits, "story-circle");
  const own = attachPortrait(ownCards, portraits, "story-circle");
  const ownSuggestions = await getSuggestionsForRecords("StoryCircleCard", own.map((c) => c.id));
  const allIds = [...exampleCards, ...own].map((c) => c.id);
  const allComments = await getCommentsForRecords("StoryCircleCard", allIds);

  return (
    <Subtabs
      variant="toggle"
      tabs={[
        {
          label: "Примеры",
          content: (
            <StoryCircleExamplesList
              studentId={studentId}
              initialCards={exampleCards}
              isMentorViewer={isMentorViewer}
              comments={allComments}
            />
          ),
        },
        {
          label: "Мои герои",
          content: (
            <StoryCircleOwnList
              studentId={studentId}
              initialCards={own}
              suggestions={ownSuggestions}
              comments={allComments}
              isMentorViewer={isMentorViewer}
            />
          ),
        },
      ]}
    />
  );
}
