import { prisma } from "@/lib/prisma";
import Subtabs from "@/components/Subtabs";
import { StoryCircleExamplesList, StoryCircleOwnList } from "./StoryCircleList";
import { STORY_CIRCLE_SEED } from "./seedData";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { getCommentsForRecords } from "@/features/comments/actions";

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
    });
  }

  const ownCards = await prisma.storyCircleCard.findMany({
    where: { studentId, isExample: false },
    orderBy: { order: "asc" },
  });
  const ownSuggestions = await getSuggestionsForRecords("StoryCircleCard", ownCards.map((c) => c.id));
  const allIds = [...examples, ...ownCards].map((c) => c.id);
  const allComments = await getCommentsForRecords("StoryCircleCard", allIds);

  return (
    <Subtabs
      tabs={[
        {
          label: "Примеры",
          content: (
            <StoryCircleExamplesList
              studentId={studentId}
              initialCards={examples}
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
              initialCards={ownCards}
              suggestions={ownSuggestions}
              comments={allComments}
            />
          ),
        },
      ]}
    />
  );
}
