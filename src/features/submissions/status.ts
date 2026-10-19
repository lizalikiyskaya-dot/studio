import type { CSSProperties } from "react";
import type { SubmissionStatus } from "@/generated/prisma/client";

export const SUBMISSION_STATUSES: SubmissionStatus[] = [
  "NOT_SENT",
  "SENT",
  "WAITING",
  "ACCEPTED",
  "REJECTED",
];

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  NOT_SENT: "не отправлено",
  SENT: "отправлено",
  WAITING: "ждём ответа",
  ACCEPTED: "принято",
  REJECTED: "отклонено",
};

export const SUBMISSION_STATUS_STYLE: Record<SubmissionStatus, CSSProperties> = {
  NOT_SENT: { background: "var(--soft)", color: "var(--ink2)" },
  SENT: { background: "#FFF3C4", color: "#202020" },
  WAITING: { background: "var(--pill-blue-bg)", color: "var(--pill-blue-fg)" },
  ACCEPTED: { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" },
  REJECTED: { background: "var(--pill-red-bg)", color: "var(--pill-red-fg)" },
};

export function isSubmissionStatus(value: string): value is SubmissionStatus {
  return (SUBMISSION_STATUSES as string[]).includes(value);
}

export function openCallSentForStatus(status: SubmissionStatus): boolean {
  return status !== "NOT_SENT";
}

export function statusWhenOpenCallSentChanges(
  current: SubmissionStatus,
  sent: boolean,
): SubmissionStatus {
  if (!sent) return "NOT_SENT";
  if (current === "NOT_SENT") return "SENT";
  return current;
}

export type TrackerTargetMatch = { id: string; openCallId: string | null };

export function planOpenCallAdd(input: {
  alreadyLinked: boolean;
  target: string;
  sent: boolean;
  sameTarget: TrackerTargetMatch | null;
}):
  | { kind: "exists" }
  | { kind: "link"; submissionId: string }
  | { kind: "create"; status: "NOT_SENT" | "SENT" } {
  if (input.alreadyLinked) return { kind: "exists" };
  const target = input.target.trim();
  if (target && input.sameTarget) {
    if (!input.sameTarget.openCallId) return { kind: "link", submissionId: input.sameTarget.id };
    return { kind: "exists" };
  }
  return { kind: "create", status: input.sent ? "SENT" : "NOT_SENT" };
}
