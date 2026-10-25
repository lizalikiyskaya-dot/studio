"use client";

import Link from "next/link";

export type ChapterWeeklyCard = {
  title: string;
  until: string;
} | null;

export default function ChapterSide({
  weekly,
  weeklyHref,
}: {
  weekly: ChapterWeeklyCard;
  weeklyHref: string;
}) {
  if (!weekly) return null;
  return (
    <aside className="chapter-side">
      <section className="chapter-week">
        <div className="chapter-week-kicker">Задание недели</div>
        <p>{weekly.title}</p>
        <div className="chapter-week-foot">
          <span>{weekly.until}</span>
          <Link href={weeklyHref} className="chapter-week-open">Открыть</Link>
        </div>
      </section>
    </aside>
  );
}
