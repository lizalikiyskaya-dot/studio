"use client";

import Link from "next/link";
import WeekCallNote from "./WeekCallNote";
import type { WeekSideModel } from "@/lib/weekSide";

export default function WeekSide({
  week,
  deadline,
}: {
  week: WeekSideModel;
  deadline: { title: string; when: string } | null;
}) {
  if (!week.weekly && !week.call && !deadline) return null;
  return (
    <div className="week-side">
      {week.weekly ? (
        <Link href={week.weekly.href} className="week-side-task">
          <span className="deadline-ribbon" aria-hidden="true" />
          <span className="week-side-kicker">Задание недели</span>
          <span className="week-side-title">{week.weekly.title}</span>
          <span className="week-side-when">{week.weekly.when}</span>
        </Link>
      ) : null}
      {week.call ? (
        <WeekCallNote
          title={week.call.title}
          deadline={week.call.deadline}
          note=""
          untilLabel=""
          actions={<Link href={week.call.href}>Открыть</Link>}
        />
      ) : null}
      {deadline ? (
        <div className="deadline-card">
          <span className="deadline-ribbon" aria-hidden="true" />
          <div className="deadline-kicker">Ближайший дедлайн по заданию</div>
          <div className="serif deadline-title">{deadline.title}</div>
          <div className="deadline-when">{deadline.when}</div>
        </div>
      ) : null}
    </div>
  );
}
