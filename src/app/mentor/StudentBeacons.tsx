"use client";

import { useEffect, useState } from "react";

function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн назад`;
  return date.toLocaleDateString("ru-RU");
}

/**
 * Clear online/offline presence line for the mentor cabinet: a green
 * pulsing dot + "в сети" when the student pinged within 3 minutes,
 * otherwise a static grey dot + "был(-а) в сети N назад".
 */
export function PresenceIndicator({ lastSeenAt }: { lastSeenAt: Date | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const online = !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 3 * 60_000;
  const text = online
    ? "в сети"
    : lastSeenAt
      ? `был(-а) в сети ${relativeTime(new Date(lastSeenAt))}`
      : "ещё не заходил(-а)";

  return (
    <span className="flex items-center gap-2 text-[12px] whitespace-nowrap" style={{ color: online ? "var(--sage)" : "var(--ink-faint)" }}>
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: online ? "var(--sage)" : "var(--ink-faint)",
          opacity: online ? 1 : 0.5,
          animation: online ? "beacon-pulse 1.8s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      {text}
    </span>
  );
}

export function OnlineBeacon({ lastSeenAt }: { lastSeenAt: Date | null }) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    function check() {
      if (!lastSeenAt) return setOnline(false);
      setOnline(Date.now() - new Date(lastSeenAt).getTime() < 3 * 60_000);
    }
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [lastSeenAt]);

  if (!online) return null;

  return (
    <span
      title="Онлайн сейчас"
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--sage)",
        animation: "beacon-pulse 1.8s ease-in-out infinite",
      }}
    />
  );
}

export function ActivityBeacon({ lastActivityAt }: { lastActivityAt: Date | null }) {
  const recent = lastActivityAt && Date.now() - new Date(lastActivityAt).getTime() < 24 * 60 * 60_000;
  if (!recent) return null;

  return (
    <span
      title="Работал недавно"
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--accent)",
        animation: "beacon-pulse 2.4s ease-in-out infinite",
      }}
    />
  );
}
