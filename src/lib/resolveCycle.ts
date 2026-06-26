import { prisma } from "@/lib/prisma";

export async function resolveActiveCycle(studentId: string, requestedCycleId?: string) {
  const cycles = await prisma.cycle.findMany({
    where: { studentId },
    orderBy: { createdAt: "asc" },
  });

  if (cycles.length === 0) return { cycles, activeCycle: null };

  const activeCycle = cycles.find((c) => c.id === requestedCycleId) ?? cycles[0];
  return { cycles, activeCycle };
}
