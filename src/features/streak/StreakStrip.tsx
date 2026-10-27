"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { setStreakVacation } from "./actions";
import { readSeenStreak, writeSeenStreak } from "./seenStreak";
import StreakHelp from "./StreakHelp";
import { unseenRunWeeks, weeksLabel, type StreakPlaque } from "./weeks";

const BEAT_MS = 1000;

function prefersStill(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function weekTitle(start: string, state: StreakPlaque["weeks"][number]["state"]): string {
  const [year, month, day] = start.split("-").map(Number);
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  const label =
    state === "counted" ? "засчитана" : state === "vacation" ? "каникулы" : state === "open" ? "ещё идёт" : "пропуск";
  return `${date}, ${label}`;
}

export default function StreakStrip({
  studentId,
  streak,
  play,
  markVacation,
}: {
  studentId: string;
  streak: StreakPlaque;
  play: boolean;
  markVacation: boolean;
}) {
  const { weeks, current, best, freshStart, runStarts, countedStarts } = streak;
  const [shown, setShown] = useState(current);
  const [arriving, setArriving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const skipRef = useRef(false);
  const countedRef = useRef(countedStarts);
  countedRef.current = countedStarts;
  const weekKey = weeks.map((week) => `${week.start}:${week.state}:${week.vacation}`).join("|");
  const runKey = runStarts.join("|");

  useLayoutEffect(() => {
    if (!play) {
      setShown(current);
      setArriving(null);
      setBusy(false);
      return;
    }

    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }

    let cancelled = false;
    skipRef.current = false;
    const frames: number[] = [];
    const seen = readSeenStreak(storage, studentId);
    const remember = () => writeSeenStreak(storage, studentId, countedRef.current);

    if (seen == null || prefersStill()) {
      remember();
      setShown(current);
      setArriving(null);
      setBusy(false);
      return;
    }

    const step = unseenRunWeeks(runStarts, new Set(seen));
    if (step === 0) {
      setShown(current);
      setArriving(null);
      setBusy(false);
      return;
    }

    const from = Math.max(0, current - step);
    const target = runStarts[runStarts.length - 1] ?? null;
    setShown(from);
    setArriving(target);
    setBusy(true);
    const started = performance.now();
    const tick = (now: number) => {
      if (cancelled || skipRef.current) return;
      const t = Math.min(1, (now - started) / BEAT_MS);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (current - from) * eased));
      if (t < 1) {
        frames.push(requestAnimationFrame(tick));
        return;
      }
      setShown(current);
      setArriving(null);
      setBusy(false);
      remember();
    };
    frames.push(requestAnimationFrame(tick));

    return () => {
      cancelled = true;
      for (const frame of frames) cancelAnimationFrame(frame);
    };
  }, [play, studentId, current, runKey, weekKey, runStarts]);

  function skip() {
    if (!busy) return;
    skipRef.current = true;
    try {
      writeSeenStreak(localStorage, studentId, countedRef.current);
    } catch {
      // без хранилища анимация просто обрывается
    }
    setShown(current);
    setArriving(null);
    setBusy(false);
  }

  return (
    <div
      className="streak-strip mt-3"
      data-streak-counter=""
      data-streak-state={arriving ? "arrive" : "idle"}
      onClick={busy ? skip : undefined}
    >
      <div className="flex items-center gap-2">
        <p className="text-[14.5px] font-semibold leading-none">
          Серия: {weeksLabel(shown)} подряд
          <span className="font-normal" style={{ color: "var(--ink2)" }}>
            {" "}
            · лучшая: {best}
          </span>
        </p>
        <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <StreakHelp />
        </span>
      </div>
      <div className="streak-cells mt-2" role="list" aria-label={`Серия ${weeksLabel(current)}, лучшая ${best}`}>
        {weeks.map((week) => {
          const arrivingCell = arriving === week.start;
          const className = `streak-cell is-${arrivingCell ? "counted" : week.state}${arrivingCell ? " is-arriving" : ""}${week.vacation && week.state === "counted" ? " is-vacation-mark" : ""}`;
          const title = weekTitle(week.start, arrivingCell ? "counted" : week.state);
          if (markVacation) {
            return (
              <button
                key={week.start}
                type="button"
                role="listitem"
                className={className}
                title={title}
                aria-label={title}
                aria-pressed={week.vacation}
                disabled={pending}
                onClick={() => {
                  startTransition(() => {
                    void setStreakVacation(studentId, week.start, !week.vacation);
                  });
                }}
              >
                {week.state === "vacation" ? <span className="streak-off">отд.</span> : null}
              </button>
            );
          }
          return (
            <span key={week.start} role="listitem" className={className} title={title} aria-label={title}>
              {week.state === "vacation" && !arrivingCell ? <span className="streak-off">отд.</span> : null}
              {arrivingCell ? (
                <span className="streak-flight" aria-hidden="true">
                  <Star size={14} fill="var(--y)" strokeWidth={1.75} />
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
      {freshStart ? (
        <p className="mt-1.5 text-[13px]" style={{ color: "var(--ink2)" }}>
          Новая серия начинается с этой недели
        </p>
      ) : null}
      {markVacation ? (
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--muted)" }}>
          Каникулы — нажмите неделю. Она не рвёт серию.
        </p>
      ) : null}
    </div>
  );
}
