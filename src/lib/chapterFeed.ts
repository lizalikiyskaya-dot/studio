import { prisma } from "@/lib/prisma";

export async function recordChapterSubmitted(studentId: string, chapterId: string, title: string) {
  const label = title.trim() || "Глава";
  await prisma.chapterFeedEvent.upsert({
    where: { chapterId },
    create: { studentId, chapterId, title: label },
    update: { title: label, at: new Date() },
  });
}

export async function clearChapterSubmitted(chapterId: string) {
  await prisma.chapterFeedEvent.deleteMany({ where: { chapterId } });
}
