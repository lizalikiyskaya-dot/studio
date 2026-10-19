import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { StarKind } from "@/generated/prisma/client";
import { STAR_POINTS, type StarKindName } from "./rules";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
}

export async function starTotal(studentId: string): Promise<number> {
  const sum = await prisma.starAward.aggregate({
    where: { studentId },
    _sum: { points: true },
  });
  return sum._sum.points ?? 0;
}

/** true, если звёзды начислены сейчас. Повтор того же источника возвращает false. */
export async function awardStars(studentId: string, kind: StarKindName, sourceId: string): Promise<boolean> {
  try {
    await prisma.starAward.create({
      data: {
        studentId,
        kind: kind as StarKind,
        points: STAR_POINTS[kind],
        sourceId,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard/weekly");
  revalidatePath(`/student-view/${studentId}/tasks`);
  revalidatePath(`/student-view/${studentId}/weekly`);
  return true;
}
