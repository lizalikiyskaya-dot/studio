"use client";

import { useEffect, useState } from "react";

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
