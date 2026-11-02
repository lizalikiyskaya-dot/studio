import { prisma } from "@/lib/prisma";
import { buildStudentFeed, type StudentFeedItem } from "@/lib/studentFeed";

function missingSeen(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "42P01" || message.includes("MentorItemSeen");
}

async function loadSeen(userId: string): Promise<{ kind: string; sourceId: string; seenAt: Date }[]> {
  try {
    return await prisma.$queryRaw<{ kind: string; sourceId: string; seenAt: Date }[]>`
      SELECT kind, "sourceId", "seenAt"
      FROM "MentorItemSeen"
      WHERE "userId" = ${userId}
    `;
  } catch (error) {
    if (missingSeen(error)) return [];
    throw error;
  }
}

export async function loadStudentFeed(studentId: string, now = new Date()): Promise<StudentFeedItem[]> {
  const [tasks, notes, edits, seen] = await Promise.all([
    prisma.task.findMany({
      where: { studentId },
      select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.note.findMany({
      where: { studentId },
      select: {
        id: true,
        text: true,
        anchorLabel: true,
        anchorUrl: true,
        createdAt: true,
        updatedAt: true,
        resolved: true,
        authorRole: true,
      },
    }),
    prisma.sectionActivity.findMany({
      where: { studentId, byRole: "MENTOR" },
      select: { section: true, at: true, byRole: true },
    }),
    loadSeen(studentId),
  ]);
  return buildStudentFeed({ now, tasks, notes, edits, seen });
}

export async function markStudentFeedSeen(
  userId: string,
  items: { kind: string; sourceId: string }[],
): Promise<void> {
  const rows = items.filter((item) => item.kind && item.sourceId).slice(0, 80);
  for (const item of rows) {
    try {
      await prisma.$executeRaw`
        INSERT INTO "MentorItemSeen" ("userId", kind, "sourceId", "seenAt")
        VALUES (${userId}, ${item.kind}, ${item.sourceId}, NOW())
        ON CONFLICT ("userId", kind, "sourceId")
        DO UPDATE SET "seenAt" = EXCLUDED."seenAt"
      `;
    } catch (error) {
      if (missingSeen(error)) return;
      throw error;
    }
  }
}
