import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import AddToTrackerButton from "@/features/submissions/AddToTrackerButton";

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

function formatShort(date: Date) {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function daysUntil(date: Date) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export default async function StudioBanners({
  studentId,
  basePath,
}: {
  studentId: string;
  basePath: string;
}) {
  const [tasks, calls, submissions] = await Promise.all([
    prisma.task.findMany({
      where: { studentId, deadline: { not: null } },
      select: { id: true, title: true, deadline: true },
    }),
    prisma.openCall.findMany({ where: { studentId }, orderBy: { order: "asc" } }),
    prisma.submission.findMany({ where: { studentId }, select: { target: true, openCallId: true } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = tasks
    .filter((task) => task.deadline && task.deadline.getTime() >= today.getTime())
    .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime())
    .slice(0, 4);

  const trackedIds = new Set(submissions.map((row) => row.openCallId).filter((id): id is string => Boolean(id)));
  const trackedTargets = new Set(submissions.map((row) => row.target.trim().toLowerCase()).filter(Boolean));
  const nearest = calls
    .map((call) => ({ call, date: parseDeadline(call.deadline) }))
    .filter((row): row is { call: (typeof calls)[number]; date: Date } => row.date != null && daysUntil(row.date) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  if (upcoming.length === 0 && !nearest) return null;

  const nearestTarget = nearest?.call.target.trim().toLowerCase() ?? "";
  const inTracker = nearest
    ? trackedIds.has(nearest.call.id) || (nearestTarget.length > 0 && trackedTargets.has(nearestTarget))
    : false;
  const until = nearest ? daysUntil(nearest.date) : 0;
  const untilLabel = until === 0 ? "дедлайн сегодня" : until === 1 ? "дедлайн завтра" : `дедлайн через ${until} ${until % 10 === 1 && until % 100 !== 11 ? "день" : until % 10 >= 2 && until % 10 <= 4 && (until % 100 < 10 || until % 100 >= 20) ? "дня" : "дней"}`;

  return (
    <div className="banner-row">
      {upcoming.length > 0 && (
        <div className="banner-deadlines">
          <div className="flex items-center">
            <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>Ближайшие дедлайны</span>
            <Link href={`${basePath}/tasks`} className="lnk ml-auto inline-flex items-center gap-1 text-[13px]">
              задания <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-2">
            {upcoming.map((task, index) => {
              const hot = daysUntil(task.deadline!) <= 1;
              return (
                <div key={task.id} className="flex items-center py-1.5 text-[14px]" style={{ borderTop: index ? "1px solid #E6E6E2" : undefined }}>
                  <span className="truncate pr-3">{task.title || "Задание"}</span>
                  <span className="ml-auto shrink-0" style={{ color: hot ? "#D9481C" : "var(--ink2)", fontWeight: hot ? 600 : 400 }}>
                    {daysUntil(task.deadline!) === 1 ? "завтра" : daysUntil(task.deadline!) === 0 ? "сегодня" : formatShort(task.deadline!)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {nearest && (
        <div className="banner-call">
          <span className="deadline-ribbon" aria-hidden="true" />
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--y)" }}>Опен-колл недели</div>
          <div className="serif mt-2 text-[19px] font-medium leading-snug pr-10">
            {nearest.call.target || "Опен-колл"} — приём до {formatShort(nearest.date)}
          </div>
          <div className="mt-1.5 text-[13px] text-white/60">
            {[nearest.call.note, untilLabel].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <AddToTrackerButton openCallId={nearest.call.id} tracked={inTracker} />
            {nearest.call.link ? (
              <a href={nearest.call.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-9 px-4 rounded-full text-[13.5px] font-medium bg-white/10 text-white">
                Условия
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
