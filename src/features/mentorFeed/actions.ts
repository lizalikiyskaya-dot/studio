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
}
