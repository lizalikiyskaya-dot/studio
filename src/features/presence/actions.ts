"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function pingPresence() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return;
  await prisma.user.update({
    where: { id: session.userId },
    data: { lastSeenAt: new Date() },
  });
}

export async function recordActivity(studentId: string) {
  // Без проверки любой желающий из интернета мог писать в базу отметку
  // активности за произвольного ученика.
  const session = await getSession();
  if (!session) return;
  if (session.role !== "MENTOR" && session.userId !== studentId) return;

  await prisma.user.update({
    where: { id: studentId },
    data: { lastActivityAt: new Date() },
  });
}
