"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notifyApproved } from "@/lib/notify";

async function requireMentor() {
  const session = await getSession();
  if (!session || session.role !== "MENTOR") {
    throw new Error("Недостаточно прав");
  }
  return session;
}

export async function approveUser(userId: string) {
  await requireMentor();
  await prisma.user.update({ where: { id: userId }, data: { status: "APPROVED" } });
  // Ученик ждал решения — сообщаем на почту, что кабинет открыт.
  after(async () => {
    try {
      await notifyApproved(userId);
    } catch (error) {
      console.error("[notify] письмо об открытии доступа не ушло:", error);
    }
  });
  revalidatePath("/mentor");
}

export async function rejectUser(userId: string) {
  await requireMentor();
  await prisma.user.update({ where: { id: userId }, data: { status: "REJECTED" } });
  revalidatePath("/mentor");
}

function paymentDayOrNull(value: number | null): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    throw new Error("День оплаты — число от 1 до 31");
  }
  return value;
}

function paymentAmountOrNull(value: number | null): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw new Error("Сумма — целое число рублей");
  }
  return value;
}

export async function updatePaymentSettings(
  userId: string,
  input: { paymentDay: number | null; paymentAmount: number | null; paymentReminders: boolean }
) {
  await requireMentor();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== "STUDENT") throw new Error("Недостаточно прав");
  await prisma.user.update({
    where: { id: userId },
    data: {
      paymentDay: paymentDayOrNull(input.paymentDay),
      paymentAmount: paymentAmountOrNull(input.paymentAmount),
      paymentReminders: input.paymentReminders === true,
    },
  });
  revalidatePath("/mentor");
}

// Cycle: OPEN (APPROVED+PAID) → AWAITING (APPROVED+PENDING) → SUSPENDED
export async function cycleStudentAccess(userId: string) {
  await requireMentor();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.status === "SUSPENDED") {
    await prisma.user.update({ where: { id: userId }, data: { status: "APPROVED", paymentStatus: "PAID" } });
    // Доступ вернули — ученику стоит об этом знать.
    after(async () => {
      try {
        await notifyApproved(userId);
      } catch (error) {
        console.error("[notify] письмо об открытии доступа не ушло:", error);
      }
    });
    revalidatePath("/mentor");
    return "OPEN";
  } else if (user.paymentStatus === "PAID") {
    await prisma.user.update({ where: { id: userId }, data: { paymentStatus: "PENDING" } });
    revalidatePath("/mentor");
    return "AWAITING";
  } else {
    await prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
    revalidatePath("/mentor");
    return "SUSPENDED";
  }
}

export async function deleteStudent(userId: string) {
  await requireMentor();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/mentor");
}

export async function moveStudent(userId: string, direction: "up" | "down") {
  await requireMentor();
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", status: { in: ["APPROVED", "SUSPENDED"] } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, sortOrder: true },
  });
  const idx = students.findIndex((s) => s.id === userId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= students.length) return;
  const a = students[idx], b = students[swapIdx];
  await prisma.$transaction([
    prisma.user.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder === a.sortOrder ? (direction === "up" ? a.sortOrder - 1 : a.sortOrder + 1) : b.sortOrder } }),
    prisma.user.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
  revalidatePath("/mentor");
}
