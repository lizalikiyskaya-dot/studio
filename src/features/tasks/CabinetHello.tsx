import Mark from "@/components/Mark";
import BadgeWidget from "@/features/badges/BadgeWidget";
import type { BadgeView } from "@/features/badges/view";
import StarsStatus, { type StarPlaque } from "@/features/stars/StarsStatus";
import type { StreakPlaque } from "@/features/streak/weeks";
import type { Task } from "@/generated/prisma/client";

function ru(n: number, one: string, few: string, many: string) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} ${one}`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

function moscowParts(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((item) => item.type === type)?.value ?? "";
}

export default function CabinetHello({
  name,
  tasks,
  studentId,
  stars,
  streak,
  playStars,
  basePath,
  badgeWidget,
  badgeLine,
}: {
  name: string;
  tasks: Task[];
  studentId: string;
  stars: StarPlaque;
  streak: StreakPlaque;
  playStars: boolean;
  basePath: string;
  badgeWidget: BadgeView[];
  badgeLine: string;
}) {
  const now = new Date();
  const parts = moscowParts(now);
  const weekday = part(parts, "weekday");
  const dateLine = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${part(parts, "day")} ${part(parts, "month")}`;
  const hour = Number(part(parts, "hour"));
  const hello = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const progress = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const accepted = tasks.filter((task) => task.status === "ACCEPTED").length;
  const upcoming = tasks
    .map((task) => (task.deadline ? new Date(task.deadline) : null))
    .filter((date): date is Date => date != null && !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const deadline = upcoming
    ? new Intl.DateTimeFormat("ru-RU", { weekday: "long", timeZone: "Europe/Moscow" }).format(upcoming)
    : null;
  const progressLine = progress === 0 ? "Заданий в процессе нет" : ru(progress, "задание в процессе", "задания в процессе", "заданий в процессе");

  return (
    <section className="mb-8">
      <p className="serif text-[18px] italic" style={{ color: "var(--v)" }}>{dateLine}</p>
      <h2 className="page-title mt-2">
        {hello}, <Mark>{name || "писатель"}</Mark>
      </h2>
      <p className="mt-3 text-[16px]" style={{ color: "var(--ink2)" }}>
        {progressLine}
        {deadline ? `, ближайший дедлайн — ${deadline}.` : "."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full px-3 py-1 text-[13px] font-medium" style={{ background: "var(--pill-blue-bg)", color: "var(--pill-blue-fg)" }}>
          В процессе · {progress}
        </span>
        <span className="rounded-full px-3 py-1 text-[13px] font-medium" style={{ background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" }}>
          Принято · {accepted}
        </span>
      </div>
      <StarsStatus
        studentId={studentId}
        account={stars}
        streak={streak}
        play={playStars}
        markVacation={!playStars}
        href={`${basePath}/weekly`}
      />
      <BadgeWidget href={`${basePath}/badges`} badges={badgeWidget} line={badgeLine} />
    </section>
  );
}
