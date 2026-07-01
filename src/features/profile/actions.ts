"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function requireStudent() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") throw new Error("Нет доступа");
  return session;
}

export async function updateProfileName(name: string) {
  const session = await requireStudent();
  name = name.trim();
  if (!name) return { error: "Имя не может быть пустым" };
  await prisma.user.update({ where: { id: session.userId }, data: { name } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateProfileEmail(email: string) {
  const session = await requireStudent();
  email = email.trim().toLowerCase();
  if (!email.includes("@")) return { error: "Некорректный email" };
  const exists = await prisma.user.findFirst({ where: { email, id: { not: session.userId } } });
  if (exists) return { error: "Этот email уже занят" };
  await prisma.user.update({ where: { id: session.userId }, data: { email } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateProfilePassword(current: string, next: string) {
  const session = await requireStudent();
  if (next.length < 6) return { error: "Пароль должен быть не короче 6 символов" };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) return { error: "Неверный текущий пароль" };
  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash } });
  return { ok: true };
}

export async function updateProfileAvatar(avatarUrl: string) {
  const session = await requireStudent();
  await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl } });
  revalidatePath("/dashboard");
  return { ok: true };
}
