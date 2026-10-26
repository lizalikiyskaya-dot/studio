"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import StarsHelp from "./StarsHelp";
import { AUTHOR_RANKS, rankForStars, rankProgressLine, starsLabel } from "./rules";
import { unseenStarBeats, type StarBeat } from "./reveal";
import { readSeenStars, writeSeenStars } from "./seenStars";
import StreakStrip from "@/features/streak/StreakStrip";
import type { StreakPlaque } from "@/features/streak/weeks";

const BEAT_MS = 1000;
const REVEAL_AT = 0.5;

export type StarPlaque = {
  earned: number;
  balance: number;
  earns: { id: string; points: number }[];
};

function prefersStill(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function StarsStatus({
  studentId,
  account,
  streak,
  play,
  markVacation,
  href,
}: {
  studentId: string;
  account: StarPlaque;
  streak: StreakPlaque;
  play: boolean;
  markVacation: boolean;
  href?: string;
}) {
  const { earned, balance, earns } = account;
  const finalRank = rankForStars(earned);
  const [shown, setShown] = useState(earned);
  const [shownBalance, setShownBalance] = useState(balance);
  const [rankTitle, setRankTitle] = useState<string>(finalRank.current.title);
  const [revealing, setRevealing] = useState(false);
  const [flight, setFlight] = useState<"gain" | "level" | null>(null);
  const [busy, setBusy] = useState(false);
  const skipRef = useRef(false);
  const earnKey = earns.map((row) => `${row.id}:${row.points}`).join("|");
  const earnsRef = useRef(earns);
  earnsRef.current = earns;

  useLayoutEffect(() => {
    if (!play) {
      setShown(earned);
      setShownBalance(balance);
      setRankTitle(finalRank.current.title);
      setFlight(null);
      setRevealing(false);
      return;
    }

    let cancelled = false;
    skipRef.current = false;
    const frames: number[] = [];
    const timers: number[] = [];

    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    const rows = earnsRef.current;
    const seen = readSeenStars(storage, studentId);
    if (seen == null || prefersStill()) {
      writeSeenStars(storage, studentId, rows.map((row) => row.id));
      setShown(earned);
      setShownBalance(balance);
      setRankTitle(rankForStars(earned).current.title);
      return;
    }

    const beats = unseenStarBeats(rows, new Set(seen), earned, AUTHOR_RANKS);
    if (beats.length === 0) {
      setShown(earned);
      setShownBalance(balance);
      setRankTitle(rankForStars(earned).current.title);
      return;
    }

    setShown(beats[0].from);
    setShownBalance(balance - (earned - beats[0].from));
    setRankTitle(beats[0].rankBefore);
    setRevealing(false);
    setBusy(true);

    const remember = (ids: string[]) => {
      const current = readSeenStars(storage, studentId) ?? [];
      writeSeenStars(storage, studentId, [...current, ...ids]);
    };

    const playBeat = (beat: StarBeat) =>
      new Promise<void>((resolve) => {
        if (cancelled || skipRef.current) {
          resolve();
          return;
        }
        setFlight(beat.levelUp ? "level" : "gain");
        setRevealing(false);
        setRankTitle(beat.rankBefore);
        const started = performance.now();
        const step = (now: number) => {
          if (cancelled || skipRef.current) {
            resolve();
            return;
          }
          const t = Math.min(1, (now - started) / BEAT_MS);
          const eased = 1 - (1 - t) ** 3;
          const value = Math.round(beat.from + (beat.to - beat.from) * eased);
          setShown(value);
          setShownBalance(balance - (earned - value));
          if (beat.levelUp && t >= REVEAL_AT) {
            setRankTitle(beat.rankAfter);
            setRevealing(true);
          }
          if (t < 1) {
            frames.push(requestAnimationFrame(step));
            return;
          }
          setShown(beat.to);
          setShownBalance(balance - (earned - beat.to));
          setRankTitle(beat.rankAfter);
          setFlight(null);
          remember(beat.ids);
          resolve();
        };
        frames.push(requestAnimationFrame(step));
      });

    void (async () => {
      for (const beat of beats) {
        if (cancelled || skipRef.current) return;
        await playBeat(beat);
        if (cancelled || skipRef.current) return;
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 80);
          timers.push(timer);
        });
      }
      if (!cancelled) {
        setFlight(null);
        setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      for (const frame of frames) cancelAnimationFrame(frame);
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [play, studentId, earned, balance, earnKey, finalRank.current.title]);

  function skip() {
    if (!busy && !flight) return;
    skipRef.current = true;
    try {
      writeSeenStars(
        localStorage,
        studentId,
        earnsRef.current.map((row) => row.id),
      );
    } catch {
      // без хранилища анимация просто обрывается
    }
    setShown(earned);
    setShownBalance(balance);
    setRankTitle(finalRank.current.title);
    setRevealing(false);
    setFlight(null);
    setBusy(false);
  }

  const live = rankForStars(shown);
  const plaqueRank = flight === "level" ? rankTitle : live.current.title;
  const state = flight === "level" && revealing ? "reveal" : flight === "gain" || flight === "level" ? "fly" : "idle";

  return (
    <>
    <div
      className="stars-row mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5"
      data-stars-state={state}
      onClick={busy ? skip : undefined}
    >
      <div
        className={`stars-pill flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full py-1 pl-1 pr-3${flight === "level" ? " is-level-up" : ""}`}
        style={{ background: "#fff", border: "1px solid var(--border)" }}
        role={busy ? "button" : undefined}
        tabIndex={busy ? 0 : undefined}
        aria-label={busy ? "Новые звёзды. Нажмите, чтобы пропустить." : undefined}
        onKeyDown={
          busy
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  skip();
                }
              }
            : undefined
        }
      >
        <span
          className="stars-badge grid h-7 w-7 shrink-0 place-items-center rounded-full"
          data-star-counter=""
          style={{ background: "var(--y)", color: "var(--ink)" }}
          aria-hidden="true"
        >
          <Star size={14} />
          {flight ? (
            <span className="stars-flight">
              <Star size={18} fill="var(--y)" strokeWidth={1.75} />
            </span>
          ) : null}
        </span>
        <span className="text-[14.5px] font-semibold leading-none">Заработано {starsLabel(shown)}</span>
        <span
          className={`stars-rank text-[13px] leading-none${revealing ? " is-revealing" : ""}`}
          style={{ color: "var(--ink2)" }}
        >
          {plaqueRank}
        </span>
      </div>
      <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <StarsHelp />
      </span>
      <span className="text-[13px]" style={{ color: "var(--ink2)" }}>
        На счету {starsLabel(shownBalance)}
      </span>
      <span className="text-[13px]" style={{ color: "var(--muted)" }}>
        {rankProgressLine(shown)}
      </span>
      {href ? (
        <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <Link href={href} className="lnk text-[13px]">
            Задание недели
          </Link>
        </span>
      ) : null}
    </div>
    <StreakStrip studentId={studentId} streak={streak} play={play} markVacation={markVacation} />
    </>
  );
}
