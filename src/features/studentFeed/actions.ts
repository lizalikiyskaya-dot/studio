"use server";

import { getSession } from "@/lib/session";
import { dismissStudentFeed, markStudentFeedSeen } from "@/lib/studentFeedLoad";

export async function markStudentSeen(items: { kind: string; sourceId: string }[]) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return;
  await markStudentFeedSeen(session.userId, items);
}

export async function dismissStudentSeen(items: { kind: string; sourceId: string }[]): Promise<boolean> {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return false;
  return dismissStudentFeed(session.userId, items);
}
