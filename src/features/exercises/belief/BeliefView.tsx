import { prisma } from "@/lib/prisma";
import Subtabs from "@/components/Subtabs";
import { BeliefExamplesList, BeliefOwnList } from "./BeliefList";
import { BELIEF_SEED } from "./seedData";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";

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
  });

  if (examples.length === 0) {
    await prisma.beliefCard.createMany({
      data: BELIEF_SEED.map((seed, i) => ({ studentId, order: i, isExample: true, ...seed })),
    });
    examples = await prisma.beliefCard.findMany({
      where: { studentId, isExample: true },
      orderBy: { order: "asc" },
    });
  }

  const ownCards = await prisma.beliefCard.findMany({
    where: { studentId, isExample: false },
    orderBy: { order: "asc" },
  });
  const ownSuggestions = await getSuggestionsForRecords("BeliefCard", ownCards.map((c) => c.id));

  return (
    <Subtabs
      tabs={[
        {
          label: "Примеры",
          content: <BeliefExamplesList studentId={studentId} initialCards={examples} isMentorViewer={isMentorViewer} />,
        },
        {
          label: "Мои герои",
          content: <BeliefOwnList studentId={studentId} initialCards={ownCards} suggestions={ownSuggestions} />,
        },
      ]}
    />
  );
}
