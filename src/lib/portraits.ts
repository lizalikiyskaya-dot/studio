import { portraitPath, type PortraitKind } from "@/lib/cabinetImage";
import { prisma } from "@/lib/prisma";

export async function photoIds(kind: PortraitKind, studentId: string): Promise<Set<string>> {
  const rows =
    kind === "pop-arc"
      ? await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "PopArcCharacter"
          WHERE "studentId" = ${studentId} AND "photoUrl" IS NOT NULL
        `
      : kind === "belief"
        ? await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "BeliefCard"
            WHERE "studentId" = ${studentId} AND "photoUrl" IS NOT NULL
          `
        : await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM "StoryCircleCard"
            WHERE "studentId" = ${studentId} AND "photoUrl" IS NOT NULL
          `;
  return new Set(rows.map((row) => row.id));
}

export function attachPortrait<T extends { id: string }>(rows: T[], ids: Set<string>, kind: PortraitKind) {
  return rows.map((row) => ({
    ...row,
    photoUrl: ids.has(row.id) ? portraitPath(kind, row.id) : null,
  }));
}
