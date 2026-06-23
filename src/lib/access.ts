import { getSession } from "@/lib/session";

export class AccessDeniedError extends Error {}

/**
 * Throws unless the current session belongs to the student themselves
 * or to a mentor (mentors can view/edit any student's cabinet).
 */
export async function requireCabinetAccess(studentId: string) {
  const session = await getSession();
  if (!session) throw new AccessDeniedError("Не авторизован");
  if (session.role === "MENTOR") return session;
  if (session.userId === studentId) return session;
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
