"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appUrl } from "@/lib/mail";
import { optOutSecret, signOptOut } from "@/lib/mailOptOut";
import { customMailLetter, type CustomMailingInput } from "@/lib/customMail";
import { removeCustomMailing, writeCustomMailing } from "@/lib/customMailStore";

async function requireMentor() {
  const session = await getSession();
  if (!session || session.role !== "MENTOR") return null;
  return session;
}

export async function saveCustomMailing(input: CustomMailingInput & { id?: string }) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник сохраняет рассылку." };
  const result = await writeCustomMailing(input.id?.trim() || null, input);
  if ("error" in result) return result;
  revalidatePath("/mentor/mail");
  return { row: result.row };
}

export async function deleteCustomMailing(id: string) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник удаляет рассылку." };
  const result = await removeCustomMailing(id);
  if (result.error) return result;
  revalidatePath("/mentor/mail");
  return { ok: true as const };
}

export async function previewCustomMailing(input: { subject: string; body: string; studentId: string }) {
  const session = await requireMentor();
  if (!session) return { error: "Только наставник может смотреть это письмо." };
  const student = input.studentId
    ? await prisma.user.findFirst({
        where: { id: input.studentId, role: "STUDENT" },
        select: { id: true, name: true },
      })
    : null;
  const secret = optOutSecret();
  const unsubscribeUrl = student && secret ? `${appUrl()}/unsubscribe?token=${signOptOut(student.id, "mail", secret)}` : undefined;
  const letter = customMailLetter({
    name: student?.name || "Ученик",
    subject: input.subject,
    body: input.body,
    unsubscribeUrl,
  });
  return { subject: letter.subject, html: letter.html };
}
