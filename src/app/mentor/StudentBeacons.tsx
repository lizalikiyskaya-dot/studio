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
 * Короткая строка присутствия в списке учеников: зелёная точка и «в сети»,
 * если ученик отмечался меньше 3 минут назад, иначе серая точка и только
 * относительное время («10 мин назад»). Полная фраза остаётся в подсказке.
 */
export function PresenceIndicator({ lastSeenAt }: { lastSeenAt: Date | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const online = !!lastSeenAt && new Date().getTime() - new Date(lastSeenAt).getTime() < 3 * 60_000;
  const when = lastSeenAt ? relativeTime(new Date(lastSeenAt)) : null;
  const text = online ? "в сети" : when ?? "—";
  const title = online ? "в сети" : when ? `был(-а) в сети ${when}` : "ещё не заходил(-а)";

  return (
    <span className="mentor-presence" style={{ color: online ? "var(--sage)" : "var(--ink-faint)" }} title={title}>
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
      <span className="whitespace-nowrap">{text}</span>
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
