"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Lightweight access check (mentor, or the student themselves). Unlike
// requireCabinetAccess it does NOT stamp lastActivityAt — viewing a section
// or reading beacons must not count as the student "editing".
async function viewer(studentId: string) {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "MENTOR" && session.userId !== studentId) return null;
  return session;
}

export async function markSectionSeen(studentId: string, section: string) {
  const session = await viewer(studentId);
  if (!session) return;
  await prisma.sectionSeen.upsert({
    where: { userId_studentId_section: { userId: session.userId, studentId, section } },
    create: { userId: session.userId, studentId, section },
    update: { seenAt: new Date() },
  });
  // Refresh the layout so the section's beacon clears right away.
  revalidatePath("/", "layout");
}

export async function markSectionActivity(studentId: string, section: string) {
  const session = await viewer(studentId);
  if (!session) return;
  await prisma.sectionActivity.upsert({
    where: { studentId_section: { studentId, section } },
    create: { studentId, section, byRole: session.role },
    update: { at: new Date(), byRole: session.role },
  });
  // The actor has implicitly "seen" the section they're editing.
  await prisma.sectionSeen.upsert({
    where: { userId_studentId_section: { userId: session.userId, studentId, section } },
    create: { userId: session.userId, studentId, section },
    update: { seenAt: new Date() },
  });
}

/**
 * Sections of this student's cabinet that have updates the current viewer
 * hasn't seen yet — i.e. changed by the OTHER role more recently than the
 * viewer last opened that section.
 */
export async function getSectionBeacons(studentId: string): Promise<string[]> {
  const session = await viewer(studentId);
  if (!session) return [];
  const [activity, seen] = await Promise.all([
    prisma.sectionActivity.findMany({ where: { studentId } }),
    prisma.sectionSeen.findMany({ where: { studentId, userId: session.userId } }),
  ]);
  const seenMap = new Map(seen.map((s) => [s.section, s.seenAt.getTime()]));
  const result: string[] = [];
  for (const a of activity) {
    if (a.byRole === session.role) continue; // don't beacon your own edits
    const seenAt = seenMap.get(a.section) ?? 0;
    if (a.at.getTime() > seenAt) result.push(a.section);
  }
  return result;
}
