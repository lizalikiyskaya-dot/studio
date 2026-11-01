import { prisma } from "@/lib/prisma";

function missingOpenTable(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return code === "P2021" || code === "P2022";
}

/** true, если это первое открытие. Повтор только двигает lastOpenedAt. Таблицы ещё нет — скачивание не ломаем. */
export async function recordStudentGuideOpen(studentId: string, guideId: string, now = new Date()): Promise<boolean> {
  try {
    await prisma.guideOpen.create({
      data: { guideId, studentId, firstOpenedAt: now, lastOpenedAt: now },
    });
    return true;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code === "P2002") {
      await prisma.guideOpen.update({
        where: { guideId_studentId: { guideId, studentId } },
        data: { lastOpenedAt: now },
      });
      return false;
    }
    if (missingOpenTable(error)) return false;
    throw error;
  }
}
