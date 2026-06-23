import { prisma } from "@/lib/prisma";
import Subtabs from "@/components/Subtabs";
import { ExamplesList, OwnHeroesList } from "./PopArcsList";
import { POP_ARC_SEED } from "./seedData";

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
  });

  if (examples.length === 0) {
    await prisma.popArcCharacter.createMany({
      data: POP_ARC_SEED.map((seed, i) => ({
        studentId,
        order: i,
        isExample: true,
        name: seed.name,
        data: seed.data,
      })),
    });
    examples = await prisma.popArcCharacter.findMany({
      where: { studentId, isExample: true },
      orderBy: { order: "asc" },
    });
  }

  const ownHeroes = await prisma.popArcCharacter.findMany({
    where: { studentId, isExample: false },
    orderBy: { order: "asc" },
  });

  return (
    <Subtabs
      tabs={[
        {
          label: "Примеры",
          content: <ExamplesList studentId={studentId} initialCharacters={examples} isMentorViewer={isMentorViewer} />,
        },
        {
          label: "Мои герои",
          content: <OwnHeroesList studentId={studentId} initialCharacters={ownHeroes} />,
        },
      ]}
    />
  );
}
