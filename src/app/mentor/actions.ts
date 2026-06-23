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
