import { prisma } from "@/lib/prisma";

export type WorkshopCycle = {
  id: string;
  title: string;
  genre: string;
  imageUrl: string | null;
  storyCount: number;
};

export async function loadWorkshopCycles(studentId: string): Promise<WorkshopCycle[]> {
  const cycles = await prisma.cycle.findMany({
    where: { studentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      genre: true,
      coverUrl: true,
      bannerUrl: true,
      _count: { select: { stories: true } },
    },
  });

  return cycles.map((cycle) => ({
    id: cycle.id,
    title: cycle.title,
    genre: cycle.genre,
    imageUrl: cycle.coverUrl || cycle.bannerUrl || null,
    storyCount: cycle._count.stories,
  }));
}
