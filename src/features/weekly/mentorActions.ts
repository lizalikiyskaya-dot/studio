"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { AccessDeniedError, requireMentorSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const LIMITS = { title: 200, prompt: 8000, lengthHint: 120 };

export type WeeklyDraft = {
  publishedOn: string;
  title: string;
  prompt: string;
  lengthHint: string;
};

type Ok = { ok: true };
type Fail = { error: string };

function touch() {
  revalidatePath("/mentor/weekly");
  revalidatePath("/dashboard/weekly");
  revalidatePath("/student-view/[studentId]/weekly");
}

async function mentor(): Promise<Fail | null> {
  try {
    await requireMentorSession();
    return null;
  } catch (error) {
    if (error instanceof AccessDeniedError) return { error: "Это может править только наставник." };
    throw error;
  }
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function clean(input: WeeklyDraft): Fail | WeeklyDraft {
  const publishedOn = input.publishedOn.trim();
  const title = input.title.trim();
  const prompt = input.prompt.trim();
  const lengthHint = input.lengthHint.trim();
  if (!isIsoDate(publishedOn)) return { error: "Укажите дату в формате ГГГГ-ММ-ДД." };
  if (!title) return { error: "Нужно название." };
  if (!prompt) return { error: "Напишите текст задания." };
  if (!lengthHint) return { error: "Напишите, какого объёма ждать." };
  if (title.length > LIMITS.title) return { error: "Название длиннее 200 знаков." };
  if (prompt.length > LIMITS.prompt) return { error: "Текст длиннее 8000 знаков." };
  if (lengthHint.length > LIMITS.lengthHint) return { error: "Подсказка объёма длиннее 120 знаков." };
  return { publishedOn, title, prompt, lengthHint };
}

function unavailable(error: unknown): Fail | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) {
    return { error: "Задания недели ещё не подключены. Обновите страницу после деплоя." };
  }
  return null;
}

function taken(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createWeeklyTask(input: WeeklyDraft): Promise<{ ok: true; id: string } | Fail> {
  const denied = await mentor();
  if (denied) return denied;
  const fields = clean(input);
  if ("error" in fields) return fields;
  try {
    let id = `week-${fields.publishedOn}`;
    const clash = await prisma.weeklyTask.findUnique({ where: { id }, select: { id: true } });
    if (clash) id = `week-${fields.publishedOn}-${Date.now().toString(36)}`;
    const last = await prisma.weeklyTask.aggregate({ _max: { sortOrder: true } });
    await prisma.weeklyTask.create({
      data: { id, ...fields, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    });
    touch();
    return { ok: true, id };
  } catch (error) {
    const missing = unavailable(error);
    if (missing) return missing;
    if (taken(error)) return { error: "На эту дату задание уже есть." };
    throw error;
  }
}

export async function updateWeeklyTask(id: string, input: WeeklyDraft): Promise<Ok | Fail> {
  const denied = await mentor();
  if (denied) return denied;
  const fields = clean(input);
  if ("error" in fields) return fields;
  try {
    await prisma.weeklyTask.update({ where: { id }, data: fields });
  } catch (error) {
    const missing = unavailable(error);
    if (missing) return missing;
    if (taken(error)) return { error: "На эту дату задание уже есть." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "Этого задания уже нет." };
    }
    throw error;
  }
  touch();
  return { ok: true };
}

export async function deleteWeeklyTask(id: string): Promise<Ok | Fail> {
  const denied = await mentor();
  if (denied) return denied;
  try {
    const submissions = await prisma.weeklySubmission.count({ where: { weeklyTaskId: id } });
    if (submissions > 0) {
      return { error: "У задания уже есть сдачи. Удалить его нельзя, можно только поправить текст." };
    }
    await prisma.weeklyTask.delete({ where: { id } });
  } catch (error) {
    const missing = unavailable(error);
    if (missing) return missing;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { ok: true };
    throw error;
  }
  touch();
  return { ok: true };
}
