import { prisma } from "@/lib/prisma";
import Subtabs from "@/components/Subtabs";
import { BeliefExamplesList, BeliefOwnList } from "./BeliefList";
import { BELIEF_SEED } from "./seedData";
import { fillEmptyExamplePhotos, seededExamplePhoto } from "@/features/exercises/examplePhotos";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { getCommentsForRecords } from "@/features/comments/actions";
import { attachPortrait, photoIds } from "@/lib/portraits";

export default async function BeliefView({
  studentId,
  isMentorViewer,
}: {
  studentId: string;
  isMentorViewer: boolean;
}) {
  let examples = await prisma.beliefCard.findMany({
    where: { studentId, isExample: true },
    orderBy: { order: "asc" },
    omit: { photoUrl: true },
  });

  if (examples.length === 0) {
    await prisma.beliefCard.createMany({
      data: BELIEF_SEED.map((seed, i) => ({
        studentId,
        order: i,
        isExample: true,
        ...seed,
        photoUrl: seededExamplePhoto("belief", seed.hero, i),
      })),
    });
    examples = await prisma.beliefCard.findMany({
      where: { studentId, isExample: true },
      orderBy: { order: "asc" },
      omit: { photoUrl: true },
    });
  } else {
    const bare = await prisma.beliefCard.findMany({
      where: { studentId, isExample: true, OR: [{ photoUrl: null }, { photoUrl: "" }] },
      select: { id: true, hero: true, order: true, photoUrl: true },
    });
    await fillEmptyExamplePhotos(
      "belief",
      bare.map((row) => ({ id: row.id, name: row.hero, order: row.order, photoUrl: row.photoUrl })),
    );
  }

  const [ownCards, portraits] = await Promise.all([
    prisma.beliefCard.findMany({
      where: { studentId, isExample: false },
      orderBy: { order: "asc" },
      omit: { photoUrl: true },
    }),
    photoIds("belief", studentId),
  ]);
  const exampleCards = attachPortrait(examples, portraits, "belief");
  const own = attachPortrait(ownCards, portraits, "belief");
  const ownSuggestions = await getSuggestionsForRecords("BeliefCard", own.map((c) => c.id));
  const allComments = await getCommentsForRecords(
    "BeliefCard",
    [...exampleCards, ...own].map((c) => c.id)
  );

  return (
    <Subtabs
      variant="toggle"
      tabs={[
        {
          label: "Примеры",
          content: (
            <BeliefExamplesList
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
            <BeliefOwnList
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
