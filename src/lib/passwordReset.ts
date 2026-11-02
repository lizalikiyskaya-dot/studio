import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { RESEND_COOLDOWN_MS, cooldownRemainingMs } from "@/lib/resetWait";

export { RESEND_COOLDOWN_MS, cooldownRemainingMs, formatResetWait } from "@/lib/resetWait";

/**
 * Ссылки «Забыли пароль?».
 *
 * В письмо уходит сырой токен, в базе лежит только его SHA-256 — как и
 * пароли, он не должен восстанавливаться из дампа. Ссылка живёт час и
 * срабатывает один раз.
 */
export const RESET_TTL_MS = 60 * 60 * 1000;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

/** Общая проверка длины нового пароля — и для ссылки, и для смены в профиле. */
export function passwordLengthError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "Пароль должен быть не короче 8 символов";
  if (password.length > MAX_PASSWORD_LENGTH) return "Слишком длинный пароль";
  return null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ResetIssue =
  | { ok: true; token: string }
  | { ok: false; retryAfterMs: number };

/**
 * Создаёт токен для пользователя. Если письмо этому человеку уже уходило
 * в последние 2 минуты, нового токена нет: возвращаем, сколько ждать.
 */
export async function issueResetToken(userId: string): Promise<ResetIssue> {
  const now = Date.now();
  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId, createdAt: { gt: new Date(now - RESEND_COOLDOWN_MS) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { ok: false, retryAfterMs: cooldownRemainingMs(recent.createdAt, now) };

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(now + RESET_TTL_MS),
    },
  });
  return { ok: true, token };
}

export type ResetLookup =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export async function lookupResetToken(token: string): Promise<ResetLookup> {
  if (!token || token.length > 200) return { ok: false, reason: "invalid" };
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row) return { ok: false, reason: "invalid" };
  // Сверка постоянного времени: хэш уже найден по индексу, но лишней
  // осторожности здесь не жалко.
  const a = Buffer.from(row.tokenHash);
  const b = Buffer.from(hashToken(token));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, userId: row.userId, tokenId: row.id };
}

/**
 * Ставит новый пароль, помечает ссылку использованной и гасит остальные
 * ссылки этого человека. tokenVersion растёт в той же транзакции — старые
 * сессии перестают проходить getSession, как и при смене пароля в профиле.
 */
export async function consumeResetToken(tokenId: string, userId: string, passwordHash: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId, usedAt: null, id: { not: tokenId } },
    }),
  ]);
}

/** Неиспользованные ссылки «забыли пароль» больше не действуют. */
export async function revokeOpenResetTokens(userId: string) {
  await prisma.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });
}
