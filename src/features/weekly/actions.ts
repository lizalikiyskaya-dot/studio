"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { awardStars, starTotal } from "@/features/stars/award";
import { creditStreakWeek } from "@/features/streak/credit";
import { stampStudentSection } from "@/features/sectionBeacons/actions";
import { mentorSubmissionUrl, notifyMentorOfSubmission } from "@/lib/submissionMail";
import { moscowToday, pickWeekly } from "./schedule";

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

  const trimmed = text.trim();
  if (!trimmed) return { error: "Напишите текст, потом сдавайте." };
  if (trimmed.length > MAX_TEXT) return { error: "Текст слишком длинный. Уложитесь в 20 000 знаков." };

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
    create: { studentId, weeklyTaskId, text: trimmed },
    update: { text: trimmed },
  });
  if (!existing) {
    await creditStreakWeek(studentId);
    const task = await prisma.weeklyTask.findUnique({ where: { id: weeklyTaskId }, select: { title: true } });
    await stampStudentSection(studentId, "weekly");
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
