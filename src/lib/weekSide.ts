import { prisma } from "@/lib/prisma";
import { formatWeeklyDate, moscowToday, pickWeekly } from "@/features/weekly/schedule";

export type WeekSideModel = {
  weekly: { title: string; when: string; href: string } | null;
  call: { title: string; deadline: string; href: string } | null;
};

function parseDeadline(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(text);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(date: Date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

function formatShort(date: Date) {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export async function loadWeekSide(studentId: string, basePath: string): Promise<WeekSideModel> {
  const [tasks, calls] = await Promise.all([
    prisma.weeklyTask.findMany({
      select: { id: true, publishedOn: true, title: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.openCall.findMany({
      where: { studentId },
      select: { target: true, deadline: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const current = pickWeekly(tasks, moscowToday()).current;
  const weekly = current
    ? {
        title: current.title.trim() || "Задание недели",
        when: formatWeeklyDate(current.publishedOn),
        href: `${basePath}/weekly`,
      }
    : null;

  const nearest = calls
    .map((call) => ({ call, date: parseDeadline(call.deadline) }))
    .filter((row): row is { call: (typeof calls)[number]; date: Date } => row.date != null && daysUntil(row.date) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  const call = nearest
    ? {
        title: nearest.call.target.trim() || "Опен-колл",
        deadline: formatShort(nearest.date),
        href: `${basePath}/open-calls`,
      }
    : null;

  return { weekly, call };
}
