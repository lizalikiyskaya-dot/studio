import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Ссылки «Забыли пароль?».
 *
 * В письмо уходит сырой токен, в базе лежит только его SHA-256 — как и
 * пароли, он не должен восстанавливаться из дампа. Ссылка живёт час и
 * срабатывает один раз.
 */
export const RESET_TTL_MS = 60 * 60 * 1000;
/** Не чаще одного письма в 2 минуты на аккаунт — от «долбёжки» формой. */
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Создаёт токен для пользователя. Возвращает null, если письмо этому
 * пользователю уже отправляли только что.
 */
export async function issueResetToken(userId: string): Promise<string | null> {
  const recent = await prisma.passwordResetToken.findFirst({
    where: { userId, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return null;

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  return token;
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

/** Помечает токен использованным и убирает остальные токены этого юзера. */
export async function consumeResetToken(tokenId: string, userId: string) {
  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId, usedAt: null, id: { not: tokenId } },
    }),
  ]);
}
