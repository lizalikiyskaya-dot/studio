"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { AccessDeniedError, requireMentorSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const LIMITS = { text: 2000, author: 200, source: 300, translator: 200 };

export type QuoteRow = {
  id: string;
  text: string;
  author: string;
  source: string;
  translator: string;
  sortOrder: number;
};

type Ok = { ok: true };
type Fail = { error: string };

function touch() {
  revalidatePath("/mentor/quotes");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/student-view/[studentId]", "layout");
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

function clean(input: { text: string; author: string; source: string; translator: string }): Fail | {
  text: string;
  author: string;
  source: string;
  translator: string;
} {
  const text = input.text.trim();
  const author = input.author.trim();
  const source = input.source.trim();
  const translator = input.translator.trim();
  if (!text) return { error: "Напишите текст цитаты." };
  if (!author) return { error: "Укажите автора." };
  if (!source) return { error: "Укажите источник." };
  if (text.length > LIMITS.text) return { error: "Текст длиннее 2000 знаков." };
  if (author.length > LIMITS.author) return { error: "Имя автора длиннее 200 знаков." };
  if (source.length > LIMITS.source) return { error: "Источник длиннее 300 знаков." };
  if (translator.length > LIMITS.translator) return { error: "Переводчик длиннее 200 знаков." };
  return { text, author, source, translator };
}

function unavailable(error: unknown): Fail | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) {
    return { error: "Список цитат ещё не подключён. Обновите страницу после деплоя." };
  }
  return null;
}

export async function createQuote(input: {
  text: string;
  author: string;
  source: string;
  translator: string;
}): Promise<{ ok: true; quote: QuoteRow } | Fail> {
  const denied = await mentor();
  if (denied) return denied;
  const fields = clean(input);
  if ("error" in fields) return fields;
  try {
    const last = await prisma.dailyQuote.aggregate({ _max: { sortOrder: true } });
    const quote = await prisma.dailyQuote.create({
      data: { ...fields, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    });
    touch();
    return { ok: true, quote };
  } catch (error) {
    const missing = unavailable(error);
    if (missing) return missing;
    throw error;
  }
}

export async function updateQuote(
  id: string,
  input: { text: string; author: string; source: string; translator: string },
): Promise<Ok | Fail> {
  const denied = await mentor();
  if (denied) return denied;
  const fields = clean(input);
  if ("error" in fields) return fields;
  try {
    await prisma.dailyQuote.update({ where: { id }, data: fields });
  } catch (error) {
    const missing = unavailable(error);
    if (missing) return missing;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "Этой цитаты уже нет в списке." };
    }
    throw error;
  }
  touch();
  return { ok: true };
}

export async function deleteQuote(id: string): Promise<Ok | Fail> {
  const denied = await mentor();
  if (denied) return denied;
  try {
    await prisma.dailyQuote.delete({ where: { id } });
  } catch (error) {
    const missing = unavailable(error);
    if (missing) return missing;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return { ok: true };
    throw error;
  }
  touch();
  return { ok: true };
}

export async function moveQuote(id: string, direction: "up" | "down"): Promise<Ok | Fail> {
  const denied = await mentor();
  if (denied) return denied;
  try {
    const quotes = await prisma.dailyQuote.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const index = quotes.findIndex((quote) => quote.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= quotes.length) return { ok: true };
    const ids = quotes.map((quote) => quote.id);
    const next = [...ids];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    await prisma.$transaction(
      next.map((quoteId, order) => prisma.dailyQuote.update({ where: { id: quoteId }, data: { sortOrder: order + 1 } })),
    );
  } catch (error) {
    const missing = unavailable(error);
    if (missing) return missing;
    throw error;
  }
  touch();
  return { ok: true };
}
