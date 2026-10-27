import { prisma } from "@/lib/prisma";
import Subtabs from "@/components/Subtabs";
import { ExamplesList, OwnHeroesList } from "./PopArcsList";
import { POP_ARC_SEED } from "./seedData";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { getCommentsForRecords } from "@/features/comments/actions";
import { attachPortrait, photoIds } from "@/lib/portraits";

export default async function PopArcsView({
  studentId,
  isMentorViewer,
}: {
  studentId: string;
  isMentorViewer: boolean;
}) {
  let examples = await prisma.popArcCharacter.findMany({
    where: { studentId, isExample: true },
    orderBy: { order: "asc" },
    omit: { photoUrl: true },
  });

  if (examples.length === 0) {
    await prisma.popArcCharacter.createMany({
      data: POP_ARC_SEED.map((seed, i) => ({
        studentId,
        order: i,
        isExample: true,
        name: seed.name,
        arcType: seed.arcType,
        data: seed.data,
      })),
    });
    examples = await prisma.popArcCharacter.findMany({
      where: { studentId, isExample: true },
      orderBy: { order: "asc" },
      omit: { photoUrl: true },
    });
  }

  const [ownHeroes, portraits] = await Promise.all([
    prisma.popArcCharacter.findMany({
      where: { studentId, isExample: false },
      orderBy: { order: "asc" },
      omit: { photoUrl: true },
    }),
    photoIds("pop-arc", studentId),
  ]);
  const exampleCards = attachPortrait(examples, portraits, "pop-arc");
  const heroes = attachPortrait(ownHeroes, portraits, "pop-arc");
  const ownSuggestions = await getSuggestionsForRecords("PopArcCharacter", heroes.map((c) => c.id));
  const allIds = [...exampleCards, ...heroes].map((c) => c.id);
  const allComments = await getCommentsForRecords("PopArcCharacter", allIds);

  return (
    <Subtabs
      variant="toggle"
      tabs={[
        {
          label: "Примеры",
          content: (
            <ExamplesList
              studentId={studentId}
              initialCharacters={exampleCards}
              isMentorViewer={isMentorViewer}
              comments={allComments}
            />
          ),
        },
        {
          label: "Мои герои",
          content: (
            <OwnHeroesList
              studentId={studentId}
              initialCharacters={heroes}
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
