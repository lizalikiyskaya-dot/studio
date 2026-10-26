import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BOOK_COMPLETE_NOTE, BOOK_COMPLETE_SOURCE_ID } from "@/features/stars/rules";
import { evaluateStreak } from "@/features/streak/weeks";
import { GENERIC_METHODICAL_IMAGE } from "./catalogue";
import { autoBadgeIds, emptyBadgeFacts, guideBadgeCopy, guideBadgeId, matchKeyMethodical, missingAutoBadgeIds, type BadgeFacts } from "./rules";

function missingSchema(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return code === "P2021" || code === "P2022";
}

function isUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

function weekIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function loadBadgeFacts(studentId: string): Promise<BadgeFacts> {
  const [submittedTasks, acceptedTasks, acceptedChapters, weeklySubmissions, submissions, stars, credits, vacations] =
    await Promise.all([
      prisma.task.count({ where: { studentId, status: { in: ["SUBMITTED", "ACCEPTED"] } } }),
      prisma.task.findMany({ where: { studentId, status: "ACCEPTED" }, select: { title: true } }),
      prisma.planChapter.count({ where: { reviewStatus: "ACCEPTED", book: { studentId } } }),
      prisma.weeklySubmission.count({ where: { studentId } }),
      prisma.submission.findMany({ where: { studentId }, select: { type: true, status: true } }),
      prisma.starAward.findMany({
        where: { studentId, direction: "EARN" },
        select: { points: true, sourceId: true, note: true },
      }),
      prisma.streakWeek.findMany({ where: { studentId }, select: { weekStart: true } }),
      prisma.streakVacation.findMany({ where: { studentId }, select: { weekStart: true } }),
    ]);

  const countedWeeks = credits.map((row) => weekIso(row.weekStart));
  const vacationWeeks = vacations.map((row) => weekIso(row.weekStart));
  const streak = evaluateStreak(countedWeeks, vacationWeeks);
  const facts = emptyBadgeFacts();
  facts.submittedTasks = submittedTasks;
  facts.acceptedTaskTitles = acceptedTasks.map((task) => task.title);
  facts.acceptedChapters = acceptedChapters;
  facts.weeklySubmissions = weeklySubmissions;
  facts.earnedStars = stars.reduce((sum, row) => sum + row.points, 0);
  facts.bookComplete = stars.some(
    (row) => row.sourceId === BOOK_COMPLETE_SOURCE_ID || row.note === BOOK_COMPLETE_NOTE,
  );
  // Ушедшая заявка: любой статус, кроме «не отправлено». Издательство считается отдельно.
  facts.contestSent = submissions.some((row) => row.type === "CONTEST" && row.status !== "NOT_SENT");
  facts.contestRejected = submissions.some((row) => row.type === "CONTEST" && row.status === "REJECTED");
  facts.contestAccepted = submissions.some((row) => row.type === "CONTEST" && row.status === "ACCEPTED");
  facts.publisherSent = submissions.some((row) => row.type === "PUBLISHER" && row.status !== "NOT_SENT");
  facts.publisherAccepted = submissions.some((row) => row.type === "PUBLISHER" && row.status === "ACCEPTED");
  facts.streakBest = streak.best;
  facts.countedWeeks = countedWeeks;
  facts.vacationWeeks = vacationWeeks;
  return facts;
}

/** Ставит недостающие автоматические значки. Снятый значок сам не возвращается. */
export async function syncAutoBadges(studentId: string): Promise<void> {
  try {
    const [facts, existing] = await Promise.all([
      loadBadgeFacts(studentId),
      prisma.badgeAward.findMany({ where: { studentId }, select: { badgeId: true } }),
    ]);
    const missing = missingAutoBadgeIds(
      autoBadgeIds(facts),
      existing.map((row) => row.badgeId),
    );
    if (missing.length === 0) return;
    let inserted = 0;
    for (const badgeId of missing) {
      try {
        await prisma.badgeAward.create({
          data: { studentId, badgeId, source: "AUTO" },
        });
        inserted += 1;
      } catch (error) {
        if (isUnique(error)) continue;
        if (missingSchema(error)) return;
        const foreign = typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2003";
        if (foreign) continue;
        throw error;
      }
    }
    if (inserted === 0) return;
    revalidatePath("/dashboard/badges");
    revalidatePath("/dashboard/tasks");
    revalidatePath(`/student-view/${studentId}/badges`);
    revalidatePath(`/student-view/${studentId}/tasks`);
  } catch (error) {
    if (missingSchema(error)) return;
    throw error;
  }
}

/** Справочная строка для методички. Ключевая цепляется к готовому значку, новая получает свой. */
export async function ensureGuideBadge(guideId: string, title: string): Promise<void> {
  try {
    const key = matchKeyMethodical(title);
    if (key) {
      const row = await prisma.badge.findUnique({ where: { id: key.id }, select: { guideId: true } });
      if (row && (row.guideId == null || row.guideId === guideId)) {
        if (row.guideId !== guideId) {
          await prisma.badge.update({ where: { id: key.id }, data: { guideId } });
        }
        await prisma.badge.deleteMany({ where: { id: guideBadgeId(guideId), awards: { none: {} } } });
        return;
      }
    }
    const copy = guideBadgeCopy(title);
    await prisma.badge.upsert({
      where: { id: guideBadgeId(guideId) },
      create: {
        id: guideBadgeId(guideId),
        title: copy.title,
        hint: copy.hint,
        hintFormal: copy.hintFormal,
        section: "methodical",
        image: GENERIC_METHODICAL_IMAGE,
        sortOrder: 800,
        guideId,
      },
      update: {
        title: copy.title,
        hint: copy.hint,
        hintFormal: copy.hintFormal,
        guideId,
      },
    });
  } catch (error) {
    if (missingSchema(error)) return;
    throw error;
  }
}

export async function removeGuideBadge(guideId: string): Promise<void> {
  try {
    await prisma.badge.deleteMany({ where: { id: guideBadgeId(guideId) } });
  } catch (error) {
    if (missingSchema(error)) return;
    throw error;
  }
}
