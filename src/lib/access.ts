import { getSession, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export class AccessDeniedError extends Error {}

/**
 * Роль и статус читаем из БД, а НЕ из токена сессии.
 *
 * Токен живёт 30 дней и хранит роль/статус на момент входа. Без сверки с
 * базой ученик, которому наставник закрыл доступ (SUSPENDED) или которого
 * ещё не одобрили (PENDING), продолжал бы дёргать серверные действия до
 * истечения куки — интерфейс его не пускает, а вот действия отрабатывали.
 */
async function currentUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AccessDeniedError("Не авторизован");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true },
  });
  // Пользователя могли удалить — старый токен не должен ничего открывать.
  if (!user) throw new AccessDeniedError("Не авторизован");

  return { userId: user.id, role: user.role, status: user.status };
}

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
  const session = await currentUser();
  if (session.role === "MENTOR") return session;

  // Ученик работает, только пока доступ открыт.
  if (session.status !== "APPROVED") {
    throw new AccessDeniedError("Доступ к платформе приостановлен");
  }

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

/**
 * Любой пользователь с открытым доступом (без привязки к чужому кабинету).
 * Нужен там, где действие само по себе безобидно, но постороннему из
 * интернета его дёргать незачем.
 */
export async function requireAuthenticated() {
  const session = await currentUser();
  if (session.role !== "MENTOR" && session.status !== "APPROVED") {
    throw new AccessDeniedError("Доступ к платформе приостановлен");
  }
  return session;
}
