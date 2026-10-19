import { cycleImagePath } from "@/lib/cabinetImage";
import { prisma } from "@/lib/prisma";

export type WorkshopCycle = {
  id: string;
  title: string;
  genre: string;
  imageUrl: string | null;
  storyCount: number;
};

export async function loadWorkshopCycles(studentId: string): Promise<WorkshopCycle[]> {
  const [cycles, covers] = await Promise.all([
    prisma.cycle.findMany({
      where: { studentId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        genre: true,
        _count: { select: { stories: true } },
      },
    }),
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Cycle"
      WHERE "studentId" = ${studentId}
        AND ("coverUrl" IS NOT NULL OR "bannerUrl" IS NOT NULL)
    `,
  ]);
  const withImage = new Set(covers.map((row) => row.id));

  return cycles.map((cycle) => ({
    id: cycle.id,
    title: cycle.title,
    genre: cycle.genre,
    imageUrl: withImage.has(cycle.id) ? cycleImagePath(cycle.id, "card") : null,
    storyCount: cycle._count.stories,
  }));
}
