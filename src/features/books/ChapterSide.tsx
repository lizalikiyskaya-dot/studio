"use client";

import Link from "next/link";

export type ChapterDeadlineMark = { iso: string; label: string };

export type ChapterCommentPreview = {
  author: string;
  text: string;
  where: string;
} | null;

export type ChapterWeeklyCard = {
  title: string;
  until: string;
} | null;

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function monthParts(now = new Date()) {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day, key };
}

function mondayIndex(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const sunday = date.getUTCDay();
  return (sunday + 6) % 7;
}

export default function ChapterSide({
  deadlines,
  comment,
  weekly,
  weeklyHref,
}: {
  deadlines: ChapterDeadlineMark[];
  comment: ChapterCommentPreview;
  weekly: ChapterWeeklyCard;
  weeklyHref: string;
}) {
  const { year, month, day, key } = monthParts();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = mondayIndex(year, month, 1);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const byDay = new Map<number, string[]>();
  for (const mark of deadlines) {
    if (!mark.iso.startsWith(`${year}-${String(month).padStart(2, "0")}-`)) continue;
    const markDay = Number(mark.iso.slice(8, 10));
    const list = byDay.get(markDay) ?? [];
    list.push(mark.label);
    byDay.set(markDay, list);
  }
  const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "Europe/Moscow" }).format(new Date());

  return (
    <aside className="chapter-side">
      <section className="sheet chapter-cal" aria-label="Сроки">
        <div className="chapter-cal-head">
          <h2>{monthName}</h2>
          <span>сегодня {day}</span>
        </div>
        <div className="chapter-cal-grid">
          {WEEKDAYS.map((name) => (
            <span key={name} className="chapter-cal-wd">{name}</span>
          ))}
          {cells.map((value, index) => {
            if (!value) return <span key={`e-${index}`} />;
            const iso = `${year}-${String(month).padStart(2, "0")}-${String(value).padStart(2, "0")}`;
            const labels = byDay.get(value) ?? [];
            const today = iso === key;
            return (
              <span
                key={iso}
                className={today ? "is-today" : labels.length ? "is-mark" : undefined}
                title={labels.join(", ") || undefined}
              >
                {value}
              </span>
            );
          })}
        </div>
        <p className="chapter-cal-note">У глав отдельного срока нет. Жёлтым отмечены дедлайны заданий.</p>
      </section>

      <section className="sheet chapter-comment">
        <h2>Комментарий наставника</h2>
        {comment ? (
          <>
            <p className="chapter-comment-where">{comment.where}</p>
            <p className="chapter-comment-text">«{comment.text}»</p>
            <p className="chapter-comment-author">{comment.author}</p>
          </>
        ) : (
          <p className="chapter-cal-note">Комментариев к книге и главам пока нет. Их по-прежнему пишут в карточке книги и в плане.</p>
        )}
      </section>

      <section className="chapter-week">
        <div className="chapter-week-kicker">Задание недели</div>
        {weekly ? (
          <>
            <p>{weekly.title}</p>
            <div className="chapter-week-foot">
              <span>{weekly.until}</span>
              <Link href={weeklyHref} className="chapter-week-open">Открыть</Link>
            </div>
          </>
        ) : (
          <p>Задания недели ещё нет.</p>
        )}
      </section>
    </aside>
  );
}
