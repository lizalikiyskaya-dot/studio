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
        <Link href={week.weekly.href} className="banner-week">
          <span className="banner-week-label">Задание недели</span>
          <span className="banner-week-title">{week.weekly.title}</span>
          <span className="banner-week-when">{week.weekly.when}</span>
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
        <div className="banner-deadlines week-side-due">
          <div className="banner-week-label">Ближайший дедлайн по заданию</div>
          <div className="banner-week-title">{deadline.title}</div>
          <div className="banner-week-when">{deadline.when}</div>
        </div>
      ) : null}
    </div>
  );
}
