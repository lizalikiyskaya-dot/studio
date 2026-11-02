"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { awardStars, starTotal } from "@/features/stars/award";
import { creditStreakWeek } from "@/features/streak/credit";
import { mentorSubmissionUrl, notifyMentorOfSubmission } from "@/lib/submissionMail";
import { moscowToday, pickWeekly } from "./schedule";
import { weeklyPlain } from "./weeklyText";

const MAX_TEXT = 20_000;

export async function submitWeeklyTask(
  studentId: string,
  weeklyTaskId: string,
  text: string,
): Promise<{ ok: true; awarded: boolean; total: number } | { error: string }> {
  const session = await requireCabinetAccess(studentId);
  if (session.role !== "STUDENT" || session.userId !== studentId) {
    return { error: "Сдать задание может только ученик." };
  }

  const stored = text.replace(/\r\n/g, "\n").trim();
  const visible = weeklyPlain(stored).trim();
  if (!visible) return { error: "Напишите текст, потом сдавайте." };
  if (visible.length > MAX_TEXT) return { error: "Текст слишком длинный. Уложитесь в 20 000 знаков." };

  const tasks = await prisma.weeklyTask.findMany({ select: { id: true, publishedOn: true } });
  const { current } = pickWeekly(tasks, moscowToday());
  if (!current || current.id !== weeklyTaskId) {
    return { error: "Сейчас это задание сдать нельзя." };
  }

  const existing = await prisma.weeklySubmission.findUnique({
    where: { studentId_weeklyTaskId: { studentId, weeklyTaskId } },
    select: { id: true },
  });
  await prisma.weeklySubmission.upsert({
    where: { studentId_weeklyTaskId: { studentId, weeklyTaskId } },
    create: { studentId, weeklyTaskId, text: stored },
    update: { text: stored },
  });
  if (!existing) {
    await creditStreakWeek(studentId);
    const task = await prisma.weeklyTask.findUnique({ where: { id: weeklyTaskId }, select: { title: true } });
    await noteWeeklySubmit(studentId);
    await notifyMentorOfSubmission({
      actorRole: "STUDENT",
      previous: null,
      next: "SUBMITTED",
      studentId,
      section: "Задание недели",
      title: task?.title ?? "Задание недели",
      url: mentorSubmissionUrl(studentId, "weekly", weeklyTaskId),
    });
  }

  // 2 звёзды один раз на неделю, в момент сдачи учеником. Наставник «принято» не ставит.
  // Повторная сдача обновляет текст и сюда не добавляет очки. Письмо уходит только с первой сдачи.
  const awarded = await awardStars(studentId, "WEEKLY", weeklyTaskId);
  return { ok: true, awarded, total: await starTotal(studentId) };
}

/** Маячок наставнику. Письмо «правки ученика» отсюда не уходит: сдача шлёт своё письмо. */
async function noteWeeklySubmit(studentId: string) {
  await prisma.sectionActivity.upsert({
    where: { studentId_section: { studentId, section: "weekly" } },
    create: { studentId, section: "weekly", byRole: "STUDENT" },
    update: { at: new Date(), byRole: "STUDENT" },
  });
}
