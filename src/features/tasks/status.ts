import type { TaskStatus } from "@/generated/prisma/client";

export const TASK_STATUSES: TaskStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "SUBMITTED",
  "NEEDS_REVISION",
  "ACCEPTED",
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  PLANNED: "запланировано",
  IN_PROGRESS: "в процессе",
  SUBMITTED: "сдано на проверку",
  NEEDS_REVISION: "на доработке",
  ACCEPTED: "принято",
};

export const TASK_FILTERS: { id: string; label: string; status: TaskStatus | null; bg: string; color: string }[] = [
  { id: "all", label: "Все задачи", status: null, bg: "var(--deep)", color: "#fff" },
  { id: "progress", label: "В процессе", status: "IN_PROGRESS", bg: "var(--pill-blue-bg)", color: "var(--pill-blue-fg)" },
  { id: "planned", label: "Запланировано", status: "PLANNED", bg: "var(--soft)", color: "var(--ink)" },
  { id: "submitted", label: "Сдано на проверку", status: "SUBMITTED", bg: "var(--pill-vio-bg)", color: "var(--pill-vio-fg)" },
  { id: "revision", label: "На доработке", status: "NEEDS_REVISION", bg: "var(--pill-or-bg)", color: "var(--pill-or-fg)" },
  { id: "accepted", label: "Принято", status: "ACCEPTED", bg: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" },
];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as string[]).includes(value);
}
