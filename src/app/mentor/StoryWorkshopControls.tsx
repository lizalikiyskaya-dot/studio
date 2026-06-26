"use client";

import { useState, useTransition } from "react";
import { toggleStoryWorkshopLock } from "@/features/storyWorkshopLock/actions";

export default function StoryWorkshopControls({
  userId,
  unlocked: initialUnlocked,
}: {
  userId: string;
  unlocked: boolean;
}) {
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [, startTransition] = useTransition();

  function handleToggle() {
    setUnlocked((v) => !v);
    startTransition(() => void toggleStoryWorkshopLock(userId));
  }

  return (
    <button
      onClick={handleToggle}
      className="font-mono-label text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{
        background: unlocked ? "var(--sage)" : "#fff",
        color: unlocked ? "#fff" : "var(--wine)",
        border: `1px solid ${unlocked ? "var(--sage)" : "var(--wine)"}`,
      }}
      title="Мастерская рассказов"
    >
      {unlocked ? "🔓 рассказы открыты" : "🔒 рассказы закрыты"}
    </button>
  );
}
