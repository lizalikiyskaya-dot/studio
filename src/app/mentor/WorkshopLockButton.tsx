"use client";

import { useState, useTransition } from "react";
import { Lock, Unlock } from "lucide-react";

export default function WorkshopLockButton({
  unlocked: initialUnlocked,
  onToggle,
  labelOn,
  labelOff,
}: {
  unlocked: boolean;
  onToggle: () => Promise<boolean>;
  labelOn: string;
  labelOff: string;
}) {
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [, startTransition] = useTransition();

  function handleToggle() {
    setUnlocked((v) => !v);
    startTransition(() => void onToggle());
  }

  return (
    <button
      onClick={handleToggle}
      className="font-mono-label flex items-center gap-1.5 text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{
        background: unlocked ? "var(--sage)" : "#fff",
        color: unlocked ? "#fff" : "var(--wine)",
        border: `1px solid ${unlocked ? "var(--sage)" : "var(--wine)"}`,
      }}
    >
      {unlocked ? <Unlock size={11} /> : <Lock size={11} />}
      {unlocked ? labelOn : labelOff}
    </button>
  );
}
