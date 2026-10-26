"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AccessDeniedError, requireAuthenticated, requireMentorSession } from "@/lib/access";
import { forgetGuidesSchema } from "@/lib/guides";
import { starAccount } from "@/features/stars/award";
import { isStarPrice, missingStarsLabel, planPurchase } from "./prices";
import { forgetShopSchema, loadShopGuides, shopSchemaReady } from "./load";

const NOT_READY = "Магазин ещё не подключен. Сначала нужно выполнить SQL.";

export type BuyResult =
  | { ok: true; balance: number; earned: number; awardId: string }
  | { ok: false; error: string; missing?: number };

function missingSchema(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return code === "P2021" || code === "P2022";
}

function uniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
}

class PurchaseAbort extends Error {
  constructor(
    readonly reason: "missing" | "open",
    readonly missing?: number,
  ) {
    super(reason);
  }
}

function touch(studentId: string) {
  revalidatePath("/dashboard/shop");
  revalidatePath("/dashboard/materials");
  revalidatePath("/dashboard/tasks");
  revalidatePath(`/student-view/${studentId}/shop`);
  revalidatePath(`/student-view/${studentId}/materials`);
  revalidatePath(`/student-view/${studentId}/tasks`);
  revalidatePath("/mentor/guides");
}

export async function buyMethodicals(guideIds: string[]): Promise<BuyResult> {
  let session;
  try {
    session = await requireAuthenticated();
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: error.message };
    throw error;
  }
  if (session.role !== "STUDENT") return { ok: false, error: "Покупку делает ученик." };
  const studentId = session.userId;
  if (!(await shopSchemaReady())) return { ok: false, error: NOT_READY };

  let guides;
  try {
    guides = await loadShopGuides(studentId);
  } catch (error) {
    if (missingSchema(error)) {
      forgetShopSchema();
      return { ok: false, error: NOT_READY };
    }
    throw error;
  }
  const account = await starAccount(studentId);
  const plan = planPurchase(guides, guideIds, account.balance, account.earned);
  if (!plan.ok) {
    if (plan.reason === "missing") return { ok: false, error: missingStarsLabel(plan.missing), missing: plan.missing };
    if (plan.reason === "open") return { ok: false, error: "Эта методичка уже открыта." };
    return { ok: false, error: "Методичка не найдена." };
  }

  let awardId = "";
  try {
    awardId = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${studentId})::bigint)`;
      const rows = await tx.starAward.findMany({
        where: { studentId },
        select: { points: true, direction: true },
      });
      let earned = 0;
      let spent = 0;
      for (const row of rows) {
        if (row.direction === "SPEND") spent += row.points;
        else earned += row.points;
      }
      if (earned - spent < plan.price) throw new PurchaseAbort("missing", plan.price - (earned - spent));
      const access = await tx.guideAccess.findMany({
        where: { studentId, guideId: { in: plan.guideIds } },
        select: { visible: true },
      });
      if (access.some((row) => row.visible)) throw new PurchaseAbort("open");
      const award = await tx.starAward.create({
        data: {
          studentId,
          kind: "GUIDE",
          direction: "SPEND",
          points: plan.price,
          sourceId: plan.sourceId,
          note: plan.note.slice(0, 500),
        },
        select: { id: true },
      });
      for (const guideId of plan.guideIds) {
        await tx.guideAccess.upsert({
          where: { guideId_studentId: { guideId, studentId } },
          create: { guideId, studentId, visible: true },
          update: { visible: true },
        });
      }
      return award.id;
    });
  } catch (error) {
    if (error instanceof PurchaseAbort) {
      if (error.reason === "missing") {
        const gap = error.missing ?? 0;
        return { ok: false, error: missingStarsLabel(gap), missing: gap };
      }
      return { ok: false, error: "Эта методичка уже открыта." };
    }
    if (uniqueViolation(error)) return { ok: false, error: "Эта методичка уже открыта." };
    if (missingSchema(error)) {
      forgetShopSchema();
      return { ok: false, error: NOT_READY };
    }
    throw error;
  }

  touch(studentId);
  const next = await starAccount(studentId);
  return { ok: true, balance: next.balance, earned: next.earned, awardId };
}

export async function setGuideStarPrice(guideId: string, price: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireMentorSession();
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: error.message };
    throw error;
  }
  if (!isStarPrice(price)) return { ok: false, error: "Цена может быть 8, 12 или 18 звёзд." };
  if (!(await shopSchemaReady())) return { ok: false, error: NOT_READY };
  try {
    await prisma.guide.update({ where: { id: guideId }, data: { starPrice: price } });
  } catch (error) {
    if (missingSchema(error)) {
      forgetShopSchema();
      forgetGuidesSchema();
      return { ok: false, error: NOT_READY };
    }
    return { ok: false, error: "Не удалось сохранить цену." };
  }
  revalidatePath("/mentor/guides");
  revalidatePath("/dashboard/shop");
  revalidatePath("/student-view/[studentId]/shop", "page");
  return { ok: true };
}
