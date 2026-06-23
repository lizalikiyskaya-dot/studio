import { prisma } from "@/lib/prisma";
import PopArcsList from "./PopArcsList";
import { POP_ARC_SEED } from "./seedData";

export default async function PopArcsView({ studentId }: { studentId: string }) {
  let characters = await prisma.popArcCharacter.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  if (characters.length === 0) {
    await prisma.popArcCharacter.createMany({
      data: POP_ARC_SEED.map((seed, i) => ({
        studentId,
        order: i,
        name: seed.name,
        data: seed.data,
      })),
    });
    characters = await prisma.popArcCharacter.findMany({
      where: { studentId },
      orderBy: { order: "asc" },
    });
  }

  return <PopArcsList studentId={studentId} initialCharacters={characters} />;
}
