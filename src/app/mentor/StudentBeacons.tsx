"use client";

import { useEffect, useState } from "react";

function relativeTime(date: Date): string {
  const mins = Math.floor((new Date().getTime() - date.getTime()) / 60000);
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

  const online = !!lastSeenAt && new Date().getTime() - new Date(lastSeenAt).getTime() < 3 * 60_000;
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
      setOnline(new Date().getTime() - new Date(lastSeenAt).getTime() < 3 * 60_000);
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

/**
 * Красная точка у имени ученика — «есть непросмотренные изменения».
 *
 * Раньше она горела фиксированные 24 часа от последней правки и не гасла
 * после того, как наставник изменения посмотрел. Теперь источник — те же
 * данные, что и у маячков разделов (SectionActivity/SectionSeen): точка
 * пропадает, как только открыты все разделы, где ученик что-то менял.
 */
export function ActivityBeacon({ unseenAt }: { unseenAt: Date | null }) {
  if (!unseenAt) return null;

  return (
    <span
      title={`Непросмотренные изменения — ${relativeTime(new Date(unseenAt))}`}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--accent)",
        boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent)",
        animation: "pulse 2s ease-in-out infinite",
        flexShrink: 0,
      }}
    />
  );
}
