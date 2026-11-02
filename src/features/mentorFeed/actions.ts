"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isFeedKind } from "@/lib/mentorFeed";

export async function markFeedSeen(items: { kind: string; sourceId: string }[]) {
  const session = await getSession();
  if (!session || session.role !== "MENTOR") return;
  const unique = new Map<string, { kind: string; sourceId: string }>();
  for (const item of items) {
    if (!isFeedKind(item.kind) || !item.sourceId || item.sourceId.length > 200) continue;
    unique.set(`${item.kind}:${item.sourceId}`, item);
  }
  const rows = [...unique.values()];
  if (rows.length === 0) return;
  await prisma.$transaction(
    rows.map((item) =>
      prisma.mentorItemSeen.upsert({
        where: { userId_kind_sourceId: { userId: session.userId, kind: item.kind, sourceId: item.sourceId } },
        create: { userId: session.userId, kind: item.kind, sourceId: item.sourceId },
        update: { seenAt: new Date() },
      }),
    ),
  );
  revalidatePath("/mentor");
  revalidatePath("/mentor/notifications");
}

/** Прячет строку у наставника. false, если колонки ещё нет. */
export async function dismissFeed(items: { kind: string; sourceId: string }[]): Promise<boolean> {
  const session = await getSession();
  if (!session || session.role !== "MENTOR") return false;
  const unique = new Map<string, { kind: string; sourceId: string }>();
  for (const item of items) {
    if (!isFeedKind(item.kind) || !item.sourceId || item.sourceId.length > 200) continue;
    unique.set(`${item.kind}:${item.sourceId}`, item);
  }
  const rows = [...unique.values()];
  if (rows.length === 0) return true;
  try {
    for (const item of rows) {
      await prisma.$executeRaw`
        INSERT INTO "MentorItemSeen" ("userId", kind, "sourceId", "seenAt", "dismissedAt")
        VALUES (${session.userId}, ${item.kind}, ${item.sourceId}, NOW(), NOW())
        ON CONFLICT ("userId", kind, "sourceId")
        DO UPDATE SET "seenAt" = EXCLUDED."seenAt", "dismissedAt" = EXCLUDED."dismissedAt"
      `;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string }).code;
    if (code === "P2021" || code === "P2022" || code === "42P01" || message.includes("dismissedAt") || message.includes("MentorItemSeen")) {
      return false;
    }
    throw error;
  }
  revalidatePath("/mentor");
  revalidatePath("/mentor/notifications");
  return true;
}
