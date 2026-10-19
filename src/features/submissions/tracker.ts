import type { SubmissionStatus, SubmissionType } from "@/generated/prisma/client";

export function openCallTrackerFields(
  sent: boolean,
  type: SubmissionType,
): { type: SubmissionType; status: SubmissionStatus } | null {
  if (type !== "CONTEST" && type !== "PUBLISHER") return null;
  return { type, status: sent ? "SENT" : "NOT_SENT" };
}
