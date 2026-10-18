"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  clearPasswordAttempts,
  passwordAttemptLockMessage,
  registerFailedPasswordAttempt,
} from "@/lib/passwordAttempts";
import { createSession, getSession } from "@/lib/session";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;

// Any logged-in user editing their OWN account (student or mentor). All
// actions below operate on session.userId, so no per-role check is needed.
async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("Не авторизован");
  return session;
}

export async function updateProfileName(name: string) {
  const session = await requireAuth();
  name = name.trim();
  if (!name) return { error: "Имя не может быть пустым" };
  await prisma.user.update({ where: { id: session.userId }, data: { name } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfileEmail(email: string) {
  const session = await requireAuth();
  email = email.trim().toLowerCase();
  if (!email.includes("@")) return { error: "Некорректный email" };
  const exists = await prisma.user.findFirst({ where: { email, id: { not: session.userId } } });
  if (exists) return { error: "Этот email уже занят" };
  await prisma.user.update({ where: { id: session.userId }, data: { email } });
  revalidatePath("/", "layout");
  return { ok: true };
}

function validatePasswordChange(current: string, next: string, confirm: string): string | null {
  if (!current || !next || !confirm) return "Заполните все поля";
  if (
    current.length > MAX_PASSWORD_LENGTH ||
    next.length > MAX_PASSWORD_LENGTH ||
    confirm.length > MAX_PASSWORD_LENGTH
  ) {
    return "Слишком длинный пароль";
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return "Пароль должен быть не короче 8 символов";
  }
  if (next !== confirm) return "Новый пароль и повтор не совпадают";
  if (next === current) return "Новый пароль должен отличаться от текущего";
  return null;
}

export async function updateProfilePassword(current: string, next: string, confirm: string) {
  const session = await getSession();
  if (!session) return { error: "Не авторизован" };

  const formatError = validatePasswordChange(current, next, confirm);
  if (formatError) return { error: formatError };

  // Роль, статус и хеш берём из базы. В токене они могли устареть.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      status: true,
      passwordHash: true,
      tokenVersion: true,
    },
  });
  if (!user) return { error: "Не авторизован" };

  const locked = passwordAttemptLockMessage(user.id);
  if (locked) return { error: locked };

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) {
    const lockMessage = registerFailedPasswordAttempt(user.id);
    return { error: lockMessage ?? "Неверный текущий пароль" };
  }

  const sameAsCurrent = await bcrypt.compare(next, user.passwordHash);
  if (sameAsCurrent) return { error: "Новый пароль должен отличаться от текущего" };

  const passwordHash = await bcrypt.hash(next, 10);
  const expectedVersion = user.tokenVersion + 1;
  const changed = await prisma.user.updateMany({
    where: { id: user.id, tokenVersion: user.tokenVersion },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
    },
  });
  if (changed.count !== 1) {
    return { error: "Пароль уже был изменён. Войдите снова." };
  }

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, status: true, tokenVersion: true },
  });
  if (!updated || updated.tokenVersion !== expectedVersion) {
    return { error: "Пароль уже был изменён. Войдите снова." };
  }

  // Новая кука с актуальной версией — это устройство остаётся в кабинете,
  // остальные токены больше не проходят проверку в getSession.
  // Роль и статус берём из строки пользователя, не из старого токена.
  try {
    await createSession({
      userId: updated.id,
      role: updated.role,
      status: updated.status,
      tokenVersion: updated.tokenVersion,
    });
  } catch (error) {
    console.error("session refresh after password change failed", error);
    clearPasswordAttempts(user.id);
    return { error: "Пароль изменён. Войдите заново с новым паролем." };
  }
  clearPasswordAttempts(user.id);

  return { ok: true };
}

/** Письма об изменениях в кабинете (см. lib/notify.ts) — вкл/выкл для себя. */
export async function updateEmailNotifications(enabled: boolean) {
  const session = await requireAuth();
  await prisma.user.update({
    where: { id: session.userId },
    data: { emailNotifications: enabled },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfileAvatar(avatarUrl: string) {
  const session = await requireAuth();
  await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl } });
  revalidatePath("/", "layout");
  return { ok: true };
}
