"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { siteConfirm } from "@/components/SiteDialog";
import StreakHelp from "@/features/streak/StreakHelp";
import { setBadgeAward } from "./actions";
import { badgeGroups, type BadgeCabinet, type BadgeView } from "./view";
import { readSeenBadges, writeSeenBadges } from "./seenBadges";

const BEAT_MS = 1000;

function prefersStill(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function sourceLabel(source: BadgeView["source"]): string {
  if (source === "MANUAL") return "вручную";
  if (source === "AUTO") return "авто";
  return "";
}

export default function BadgeGallery({
  studentId,
  data,
  play,
  canManage,
}: {
  studentId: string;
  data: BadgeCabinet;
  play: boolean;
  canManage: boolean;
}) {
  const groups = badgeGroups(data.badges);
  const earnedIds = data.badges.flatMap((badge) => (badge.awardId ? [badge.awardId] : []));
  const earnedKey = earnedIds.join("|");
  const badgesRef = useRef(data.badges);
  badgesRef.current = data.badges;
  const [arrivingId, setArrivingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const skipRef = useRef(false);

  useLayoutEffect(() => {
    if (!play) return;
    const badges = badgesRef.current;
    const ids = badges.flatMap((badge) => (badge.awardId ? [badge.awardId] : []));
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    const seen = readSeenBadges(storage, studentId);
    if (seen == null || prefersStill()) {
      writeSeenBadges(storage, studentId, ids);
      return;
    }
    const unseen = badges.filter((badge) => badge.earned && badge.awardId && !seen.includes(badge.awardId));
    if (unseen.length === 0) return;
    const newest = [...unseen].sort((a, b) => (b.awardedAt ?? "").localeCompare(a.awardedAt ?? ""))[0];
    skipRef.current = false;
    setArrivingId(newest.awardId);
    setBusy(true);
    const node = document.querySelector(`[data-badge-id="${newest.id}"]`);
    node?.scrollIntoView({ block: "center", inline: "nearest" });
    const timer = window.setTimeout(() => {
      if (skipRef.current) return;
      writeSeenBadges(storage, studentId, [...seen, ...unseen.flatMap((badge) => (badge.awardId ? [badge.awardId] : []))]);
      setArrivingId(null);
      setBusy(false);
    }, BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [play, studentId, earnedKey]);

  function skip() {
    if (!busy) return;
    skipRef.current = true;
    try {
      const storage = window.localStorage;
      const seen = readSeenBadges(storage, studentId) ?? [];
      writeSeenBadges(storage, studentId, [...seen, ...earnedIds]);
    } catch {
      // без хранилища анимация просто обрывается
    }
    setArrivingId(null);
    setBusy(false);
  }

  function change(badge: BadgeView, on: boolean) {
    startTransition(async () => {
      if (!on) {
        const agreed = await siteConfirm(`Снять значок «${badge.title}»?`);
        if (!agreed) return;
      }
      await setBadgeAward(studentId, badge.id, on);
    });
  }

  if (!data.ready) {
    return (
      <section>
        <h1 className="page-title">Значки</h1>
        <p className="mt-3 text-[16px]" style={{ color: "var(--ink2)" }}>
          Значки появятся после обновления базы.
        </p>
      </section>
    );
  }

  return (
    <section
      data-badge-state={arrivingId ? "fly" : "idle"}
      onClick={busy ? skip : undefined}
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
      role={busy ? "button" : undefined}
      tabIndex={busy ? 0 : undefined}
      aria-label={busy ? "Новый значок. Нажмите, чтобы пропустить." : undefined}
    >
      <h1 className="page-title">Значки</h1>
      {canManage ? (
        <p className="mt-2 text-[15px]" style={{ color: "var(--ink2)" }}>
          {data.studentName}
        </p>
      ) : null}
      <p className="mt-3 max-w-[640px] text-[16px]" style={{ color: "var(--ink2)" }}>
        {data.lead}
      </p>
      {groups.map((group) => (
        <div key={group.id} className="mt-8">
          <h2 className="flex items-center gap-2 text-[18px] font-semibold">
            {group.label}
            {group.id === "streak" ? (
              <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <StreakHelp />
              </span>
            ) : null}
          </h2>
          <ul className="badge-grid mt-4">
            {group.items.map((badge) => {
              const arriving = arrivingId != null && badge.awardId === arrivingId;
              const showEarned = badge.earned && !arriving;
              return (
                <li key={badge.id} className={`badge-cell${arriving ? " is-arriving" : ""}`} data-badge-id={badge.id}>
                  <div className="badge-medal-wrap">
                    <img
                      src={badge.image}
                      alt=""
                      width={88}
                      height={88}
                      className={`badge-medal${showEarned ? "" : " is-locked"}`}
                    />
                    {arriving ? <img src={badge.image} alt="" className="badge-flight" /> : null}
                  </div>
                  <p className="mt-2 text-[14px] font-semibold leading-tight">{badge.title}</p>
                  {badge.earned && !arriving ? (
                    <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
                      {badge.awardedLabel}
                      {canManage && badge.source ? ` · ${sourceLabel(badge.source)}` : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
                      {badge.hint}
                      {badge.progressLabel ? ` ${badge.progressLabel}.` : ""}
                    </p>
                  )}
                  {canManage ? (
                    <button
                      type="button"
                      className={`badge-action mt-2${badge.earned ? "" : " is-give"}`}
                      disabled={pending}
                      onClick={(event) => {
                        event.stopPropagation();
                        change(badge, !badge.earned);
                      }}
                    >
                      {badge.earned ? "Снять" : "Выдать"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
