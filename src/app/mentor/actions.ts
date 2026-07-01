"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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
  revalidatePath("/mentor");
}

export async function rejectUser(userId: string) {
  await requireMentor();
  await prisma.user.update({ where: { id: userId }, data: { status: "REJECTED" } });
  revalidatePath("/mentor");
}

export async function updatePaymentDay(userId: string, paymentDay: number | null) {
  await requireMentor();
  await prisma.user.update({ where: { id: userId }, data: { paymentDay } });
  revalidatePath("/mentor");
}

export async function togglePaymentStatus(userId: string) {
  await requireMentor();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const next = user.paymentStatus === "PAID" ? "PENDING" : "PAID";
  await prisma.user.update({ where: { id: userId }, data: { paymentStatus: next } });
  revalidatePath("/mentor");
  return next;
}

// Cycle: OPEN (APPROVED+PAID) → AWAITING (APPROVED+PENDING) → SUSPENDED
export async function cycleStudentAccess(userId: string) {
  await requireMentor();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.status === "SUSPENDED") {
    await prisma.user.update({ where: { id: userId }, data: { status: "APPROVED", paymentStatus: "PAID" } });
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
