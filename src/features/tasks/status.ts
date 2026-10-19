import type { TaskStatus } from "@/generated/prisma/client";

export const TASK_STATUSES: TaskStatus[] = [
  "IN_PROGRESS",
  "SUBMITTED",
  "NEEDS_REVISION",
  "ACCEPTED",
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  IN_PROGRESS: "в процессе",
  SUBMITTED: "сдано на проверку",
  NEEDS_REVISION: "на доработке",
  ACCEPTED: "принято",
};

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as string[]).includes(value);
}
