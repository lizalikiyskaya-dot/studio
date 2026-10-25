import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { StarKind } from "@/generated/prisma/client";
import { STAR_POINTS, type StarKindName } from "./rules";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
}

export type StarAccount = {
  earned: number;
  balance: number;
  earns: { id: string; points: number }[];
};

/** «Заработано» — только начисления. «На счету» — начисления минус траты. */
export async function starAccount(studentId: string): Promise<StarAccount> {
  const rows = await prisma.starAward.findMany({
    where: { studentId },
    select: { id: true, points: true, direction: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  let earned = 0;
  let spent = 0;
  const earns: { id: string; points: number }[] = [];
  for (const row of rows) {
    if (row.direction === "SPEND") {
      spent += row.points;
      continue;
    }
    earned += row.points;
    earns.push({ id: row.id, points: row.points });
  }
  return { earned, balance: earned - spent, earns };
}

export async function starTotal(studentId: string): Promise<number> {
  const sum = await prisma.starAward.aggregate({
    where: { studentId, direction: "EARN" },
    _sum: { points: true },
  });
  return sum._sum.points ?? 0;
}

/** true, если звёзды начислены сейчас. Повтор того же источника возвращает false. */
export async function awardStars(
  studentId: string,
  kind: StarKindName,
  sourceId: string,
  points?: number,
): Promise<boolean> {
  try {
    await prisma.starAward.create({
      data: {
        studentId,
        kind: kind as StarKind,
        points: points ?? STAR_POINTS[kind],
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
