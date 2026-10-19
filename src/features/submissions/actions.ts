"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import type { SubmissionStatus, SubmissionType } from "@/generated/prisma/client";
import { awardStars } from "@/features/stars/award";
import { submissionReadyForStars } from "@/features/stars/rules";
import { isSubmissionStatus, openCallSentForStatus, planOpenCallAdd } from "./status";

function revalidateCabinet(studentId: string) {
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/student-view/${studentId}`, "layout");
}

function isUnique(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

async function awardSubmissionIfSent(row: { id: string; studentId: string; type: SubmissionType; status: SubmissionStatus }) {
  if (!submissionReadyForStars(row.status)) return;
  await awardStars(row.studentId, row.type === "PUBLISHER" ? "PUBLISHER" : "CONTEST", row.id);
}

export async function addOpenCallToTracker(openCallId: string): Promise<"added" | "exists"> {
  const call = await prisma.openCall.findUniqueOrThrow({ where: { id: openCallId } });
  await requireCabinetAccess(call.studentId);
  const linked = await prisma.submission.findUnique({ where: { openCallId } });
  const target = call.target.trim();
  const sameTarget = target
    ? await prisma.submission.findFirst({
        where: { studentId: call.studentId, target: { equals: target, mode: "insensitive" } },
        select: { id: true, openCallId: true },
      })
    : null;
  const plan = planOpenCallAdd({
    alreadyLinked: Boolean(linked),
    target: call.target,
    sent: call.sent,
    sameTarget,
  });

  if (plan.kind === "exists") return "exists";

  if (plan.kind === "link") {
    try {
      const row = await prisma.submission.update({
        where: { id: plan.submissionId },
        data: { openCallId: call.id },
      });
      const sent = openCallSentForStatus(row.status);
      if (sent !== call.sent) {
        await prisma.openCall.update({ where: { id: call.id }, data: { sent } });
      }
      await awardSubmissionIfSent(row);
    } catch (error) {
      if (!isUnique(error)) throw error;
    }
    revalidateCabinet(call.studentId);
    return "exists";
  }

  const count = await prisma.submission.count({ where: { studentId: call.studentId, type: "CONTEST" } });
  try {
    const row = await prisma.submission.create({
      data: {
        studentId: call.studentId,
        type: "CONTEST",
        order: count,
        target: call.target,
        date: call.deadline,
        note: call.note,
        link: call.link,
        status: plan.status,
        openCallId: call.id,
      },
    });
    await awardSubmissionIfSent(row);
  } catch (error) {
    if (!isUnique(error)) throw error;
    revalidateCabinet(call.studentId);
    return "exists";
  }
  revalidateCabinet(call.studentId);
  return "added";
}

export async function createSubmission(studentId: string, type: SubmissionType) {
  await requireCabinetAccess(studentId);
  const count = await prisma.submission.count({ where: { studentId, type } });
  const row = await prisma.submission.create({
    data: { studentId, type, order: count, status: "NOT_SENT" },
  });
  revalidateCabinet(studentId);
  return row;
}

export async function deleteSubmission(id: string) {
  const row = await prisma.submission.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  await prisma.submission.delete({ where: { id } });
  revalidateCabinet(row.studentId);
}

export async function updateSubmissionField(
  id: string,
  field: "target" | "work" | "date" | "note" | "link",
  value: string,
) {
  const row = await prisma.submission.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  await prisma.submission.update({ where: { id }, data: { [field]: value } });
}

export async function setSubmissionStatus(id: string, status: SubmissionStatus) {
  if (!isSubmissionStatus(status)) return;
  const row = await prisma.submission.findUniqueOrThrow({ where: { id } });
  await requireCabinetAccess(row.studentId);
  if (row.status === status) return status;
  const updated = await prisma.submission.update({ where: { id }, data: { status } });
  if (row.openCallId) {
    await prisma.openCall.update({
      where: { id: row.openCallId },
      data: { sent: openCallSentForStatus(status) },
    });
    revalidateCabinet(row.studentId);
  }
  // 5 или 10 звёзд один раз, когда заявка отмечена отправленной.
  // «Не отправлено» не считается. Повтор статуса не удваивает.
  await awardSubmissionIfSent(updated);
  return status;
}
