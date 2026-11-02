"use server";

import { getSession } from "@/lib/session";
import { markStudentFeedSeen } from "@/lib/studentFeedLoad";

export async function markStudentSeen(items: { kind: string; sourceId: string }[]) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") return;
  await markStudentFeedSeen(session.userId, items);
}
