import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export class AccessDeniedError extends Error {}

/**
 * Throws unless the current session belongs to the student themselves
 * or to a mentor (mentors can view/edit any student's cabinet).
 *
 * Since virtually every content-mutating server action calls this guard,
 * it's also the single choke point where we stamp lastActivityAt — but
 * ONLY when the student edits their own cabinet (not when the mentor edits
 * it), so the mentor's "недавно редактировал" beacon reflects the
 * student's own work.
 */
export async function requireCabinetAccess(studentId: string) {
  const session = await getSession();
  if (!session) throw new AccessDeniedError("Не авторизован");
  if (session.role === "MENTOR") return session;
  if (session.userId === studentId) {
    // Best-effort activity stamp; never let it break the actual edit.
    await prisma.user
      .update({ where: { id: studentId }, data: { lastActivityAt: new Date() } })
      .catch(() => {});
    return session;
  }
  throw new AccessDeniedError("Нет доступа");
}

/**
 * Throws unless the current session is a mentor. Used for actions that
 * only the mentor should perform (e.g. managing materials), even though
 * the student themselves has read/cabinet access.
 */
export async function requireMentor(studentId: string) {
  const session = await requireCabinetAccess(studentId);
  if (session.role !== "MENTOR") throw new AccessDeniedError("Только наставник");
  return session;
}
