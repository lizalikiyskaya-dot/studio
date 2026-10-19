import type { Cycle } from "@/generated/prisma/client";
import { cycleImagePath } from "@/lib/cabinetImage";
import { prisma } from "@/lib/prisma";

type ImageFlags = {
  id: string;
  cover: boolean;
  cover2: boolean;
  cover3: boolean;
  banner: boolean;
  setting: boolean;
};

function withImagePaths(
  cycle: Omit<Cycle, "coverUrl" | "coverUrl2" | "coverUrl3" | "bannerUrl" | "settingPhotoUrl">,
  flags: ImageFlags | undefined,
): Cycle {
  return {
    ...cycle,
    coverUrl: flags?.cover ? cycleImagePath(cycle.id, "cover") : null,
    coverUrl2: flags?.cover2 ? cycleImagePath(cycle.id, "cover2") : null,
    coverUrl3: flags?.cover3 ? cycleImagePath(cycle.id, "cover3") : null,
    bannerUrl: flags?.banner ? cycleImagePath(cycle.id, "banner") : null,
    settingPhotoUrl: flags?.setting ? cycleImagePath(cycle.id, "setting") : null,
  };
}

export async function resolveActiveCycle(studentId: string, requestedCycleId?: string) {
  const [rows, flags] = await Promise.all([
    prisma.cycle.findMany({
      where: { studentId },
      orderBy: { createdAt: "asc" },
      omit: {
        coverUrl: true,
        coverUrl2: true,
        coverUrl3: true,
        bannerUrl: true,
        settingPhotoUrl: true,
      },
    }),
    prisma.$queryRaw<ImageFlags[]>`
      SELECT id,
        ("coverUrl" IS NOT NULL) AS cover,
        ("coverUrl2" IS NOT NULL) AS cover2,
        ("coverUrl3" IS NOT NULL) AS cover3,
        ("bannerUrl" IS NOT NULL) AS banner,
        ("settingPhotoUrl" IS NOT NULL) AS setting
      FROM "Cycle"
      WHERE "studentId" = ${studentId}
    `,
  ]);

  const byId = new Map(flags.map((row) => [row.id, row]));
  const cycles = rows.map((cycle) => withImagePaths(cycle, byId.get(cycle.id)));
  if (cycles.length === 0) return { cycles, activeCycle: null };
  const activeCycle = cycles.find((cycle) => cycle.id === requestedCycleId) ?? cycles[0];
  return { cycles, activeCycle };
}
