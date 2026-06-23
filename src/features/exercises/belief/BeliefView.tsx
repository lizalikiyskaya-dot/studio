import { prisma } from "@/lib/prisma";
import BeliefList from "./BeliefList";
import { BELIEF_SEED } from "./seedData";

export default async function BeliefView({ studentId }: { studentId: string }) {
  let cards = await prisma.beliefCard.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  if (cards.length === 0) {
    await prisma.beliefCard.createMany({
      data: BELIEF_SEED.map((seed, i) => ({ studentId, order: i, ...seed })),
    });
    cards = await prisma.beliefCard.findMany({
      where: { studentId },
      orderBy: { order: "asc" },
    });
  }

  return <BeliefList studentId={studentId} initialCards={cards} />;
}
