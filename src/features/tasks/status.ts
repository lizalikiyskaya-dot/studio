import type { TaskStatus } from "@/generated/prisma/client";

const STATUS_CYCLE: TaskStatus[] = [
  "IN_PROGRESS",
  "SUBMITTED",
  "NEEDS_REVISION",
  "ACCEPTED",
];

export function nextTaskStatus(status: TaskStatus): TaskStatus {
  const i = STATUS_CYCLE.indexOf(status);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}
